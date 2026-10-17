package io.github.thomashtn.abcome.word.service;

import io.github.thomashtn.abcome.dictionary.service.DictionaryService;
import io.github.thomashtn.abcome.shared.exception.ConflictException;
import io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException;
import io.github.thomashtn.abcome.shared.text.Labels;
import io.github.thomashtn.abcome.shared.time.FamilyDates;
import io.github.thomashtn.abcome.word.dto.CreateWordRequest;
import io.github.thomashtn.abcome.word.dto.PronunciationRequest;
import io.github.thomashtn.abcome.word.dto.PronunciationResponse;
import io.github.thomashtn.abcome.word.dto.RecordingResponse;
import io.github.thomashtn.abcome.word.dto.UpdateWordRequest;
import io.github.thomashtn.abcome.word.dto.WordResponse;
import io.github.thomashtn.abcome.word.entity.Pronunciation;
import io.github.thomashtn.abcome.word.entity.Word;
import io.github.thomashtn.abcome.word.repository.PronunciationRepository;
import io.github.thomashtn.abcome.word.repository.WordRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Words stored in PostgreSQL, unique on their normalized label.
 */
@Service
public class DefaultWordService implements WordService {

    /**
     * Code of a word that already exists.
     */
    static final String WORD_ALREADY_EXISTS = "WORD_ALREADY_EXISTS";

    /**
     * Message of a word that already exists.
     */
    private static final String ALREADY_EXISTS_MESSAGE = "This word is already in the notebook.";

    /**
     * Message of an unknown word.
     */
    private static final String NOT_FOUND_MESSAGE = "Word not found.";

    /**
     * Word storage.
     */
    private final WordRepository wordRepository;

    /**
     * Stage storage.
     */
    private final PronunciationRepository pronunciationRepository;

    /**
     * Gives the category of a new label.
     */
    private final DictionaryService dictionaryService;

    /**
     * Application clock, in the family's zone.
     */
    private final Clock clock;

    /**
     * Creates the service.
     *
     * @param wordRepository          word storage
     * @param pronunciationRepository stage storage
     * @param dictionaryService       dictionary, for categories
     * @param clock                   application clock
     */
    public DefaultWordService(
        WordRepository wordRepository,
        PronunciationRepository pronunciationRepository,
        DictionaryService dictionaryService,
        Clock clock
    ) {
        this.wordRepository = wordRepository;
        this.pronunciationRepository = pronunciationRepository;
        this.dictionaryService = dictionaryService;
        this.clock = clock;
    }

    /**
     * Reads all words, all stages and all sound metadata, and joins them in memory: three queries in total.
     *
     * <p>Grouping keeps the query order, so stages stay oldest first and sounds newest first.</p>
     *
     * @return all words with their stages and sounds
     */
    @Override
    @Transactional(readOnly = true)
    public List<WordResponse> findAll() {
        Map<Long, List<PronunciationResponse>> stagesByWord = pronunciationRepository.findAllResponses().stream()
            .collect(Collectors.groupingBy(PronunciationResponse::wordId));
        Map<Long, List<RecordingResponse>> soundsByWord = wordRepository.findAllRecordings().stream()
            .collect(Collectors.groupingBy(RecordingResponse::wordId));
        return wordRepository.findAllByOrderByIdAsc().stream()
            .map(word -> toResponse(
                word,
                stagesByWord.getOrDefault(word.getId(), List.of()),
                soundsByWord.getOrDefault(word.getId(), List.of())
            ))
            .toList();
    }

    /**
     * Reads the word, then its stages and sounds.
     *
     * @param id word identifier
     * @return the word
     */
    @Override
    @Transactional(readOnly = true)
    public WordResponse findById(Long id) {
        return toResponse(findWord(id));
    }

    /**
     * Takes the row lock inside the caller's transaction; a lock without one would be released at once.
     *
     * @param id word identifier
     */
    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void lockForUpdate(Long id) {
        if (wordRepository.findForUpdateById(id).isEmpty()) {
            throw new ResourceNotFoundException(NOT_FOUND_MESSAGE);
        }
    }

    /**
     * Checks the label is free, then saves the word and its first stage together.
     *
     * @param request label and first stage
     * @return the created word
     */
    @Override
    @Transactional
    public WordResponse create(CreateWordRequest request) {
        PronunciationRequest firstStage = request.pronunciation();
        FamilyDates.assertNotInFuture(firstStage.date(), clock);

        String label = request.label();
        String normalizedLabel = Labels.normalize(label);
        if (wordRepository.existsByNormalizedLabel(normalizedLabel)) {
            throw new ConflictException(WORD_ALREADY_EXISTS, ALREADY_EXISTS_MESSAGE);
        }

        // PostgreSQL keeps microseconds: truncating now returns the same instant as any later read.
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        Word word = saveUnique(new Word(label, normalizedLabel, dictionaryService.categoryOf(label), now));
        pronunciationRepository.save(new Pronunciation(
            word.getId(), firstStage.spoken(), firstStage.status(), firstStage.date(), now
        ));
        return toResponse(word);
    }

    /**
     * Checks no other word has the new label, then renames.
     *
     * @param id      word identifier
     * @param request new label
     * @return the renamed word
     */
    @Override
    @Transactional
    public WordResponse rename(Long id, UpdateWordRequest request) {
        Word word = findWord(id);
        String label = request.label();
        String normalizedLabel = Labels.normalize(label);
        if (wordRepository.existsByNormalizedLabelAndIdNot(normalizedLabel, id)) {
            throw new ConflictException(WORD_ALREADY_EXISTS, ALREADY_EXISTS_MESSAGE);
        }

        word.rename(label, normalizedLabel, dictionaryService.categoryOf(label));
        return toResponse(saveUnique(word));
    }

    /**
     * Deletes the word; the database cascades to its stages and sounds.
     *
     * @param id word identifier
     */
    @Override
    @Transactional
    public void delete(Long id) {
        wordRepository.delete(findWord(id));
    }

    /**
     * Saves a word and flushes at once, so a label taken by a concurrent request is a 409, not a 500.
     *
     * @param word word to save
     * @return saved word
     */
    private Word saveUnique(Word word) {
        try {
            return wordRepository.saveAndFlush(word);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException(WORD_ALREADY_EXISTS, ALREADY_EXISTS_MESSAGE);
        }
    }

    /**
     * Reads a word entity.
     *
     * @param id word identifier
     * @return the word
     */
    private Word findWord(Long id) {
        return wordRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
    }

    /**
     * Builds the response of one word, reading its stages and sounds.
     *
     * @param word word entity
     * @return word with its stages and sounds
     */
    private WordResponse toResponse(Word word) {
        return toResponse(
            word,
            pronunciationRepository.findResponsesByWordId(word.getId()),
            wordRepository.findRecordingsByWordId(word.getId())
        );
    }

    /**
     * Builds the response of one word from stages and sounds already read.
     *
     * @param word   word entity
     * @param stages its stages, oldest first
     * @param sounds its sounds, newest first
     * @return word with its stages and sounds
     */
    private static WordResponse toResponse(
        Word word, List<PronunciationResponse> stages, List<RecordingResponse> sounds
    ) {
        return new WordResponse(
            word.getId(), word.getLabel(), word.getCategory(), word.getCreatedAt(), stages, sounds
        );
    }
}
