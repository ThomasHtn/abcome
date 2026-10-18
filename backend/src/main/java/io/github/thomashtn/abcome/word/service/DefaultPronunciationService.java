package io.github.thomashtn.abcome.word.service;

import io.github.thomashtn.abcome.shared.exception.ConflictException;
import io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException;
import io.github.thomashtn.abcome.shared.time.FamilyDates;
import io.github.thomashtn.abcome.word.dto.PronunciationRequest;
import io.github.thomashtn.abcome.word.dto.PronunciationResponse;
import io.github.thomashtn.abcome.word.entity.Pronunciation;
import io.github.thomashtn.abcome.word.entity.Word;
import io.github.thomashtn.abcome.word.repository.PronunciationRepository;
import io.github.thomashtn.abcome.word.repository.WordRepository;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stages stored in PostgreSQL; a word always keeps at least one.
 */
@Service
public class DefaultPronunciationService implements PronunciationService {

    /**
     * Code of a refused deletion of the only stage of a word.
     */
    static final String LAST_PRONUNCIATION = "LAST_PRONUNCIATION";

    /**
     * Message of an unknown stage.
     */
    private static final String NOT_FOUND_MESSAGE = "Pronunciation not found.";

    /**
     * Stage storage.
     */
    private final PronunciationRepository pronunciationRepository;

    /**
     * Word storage, to check a word exists.
     */
    private final WordRepository wordRepository;

    /**
     * Application clock, in the family's zone.
     */
    private final Clock clock;

    /**
     * Creates the service.
     *
     * @param pronunciationRepository stage storage
     * @param wordRepository          word storage
     * @param clock                   application clock
     */
    public DefaultPronunciationService(
        PronunciationRepository pronunciationRepository, WordRepository wordRepository, Clock clock
    ) {
        this.pronunciationRepository = pronunciationRepository;
        this.wordRepository = wordRepository;
        this.clock = clock;
    }

    /**
     * Reads the stage projection.
     *
     * @param id stage identifier
     * @return the stage
     */
    @Override
    @Transactional(readOnly = true)
    public PronunciationResponse findById(Long id) {
        return pronunciationRepository.findResponseById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
    }

    /**
     * Checks the word, the spoken form's length for its kind and the date, then saves the stage.
     *
     * @param wordId  word identifier
     * @param request new stage
     * @return the created stage
     */
    @Override
    @Transactional
    public PronunciationResponse add(Long wordId, PronunciationRequest request) {
        Word word = wordRepository.findById(wordId)
            .orElseThrow(() -> new ResourceNotFoundException("Word not found."));
        WordLimits.checkSpoken(word.getKind(), request.spoken());
        FamilyDates.assertNotInFuture(request.date(), clock);

        Pronunciation saved = pronunciationRepository.save(new Pronunciation(
            wordId, request.spoken(), request.status(), request.date(), clock.instant()
        ));
        return findById(saved.getId());
    }

    /**
     * Checks the spoken form's length for the word's kind and the date, then rewrites the stage.
     *
     * @param id      stage identifier
     * @param request new values
     * @return the updated stage
     */
    @Override
    @Transactional
    public PronunciationResponse update(Long id, PronunciationRequest request) {
        Pronunciation pronunciation = findEntity(id);
        wordRepository.findById(pronunciation.getWordId())
            .ifPresent(word -> WordLimits.checkSpoken(word.getKind(), request.spoken()));
        FamilyDates.assertNotInFuture(request.date(), clock);

        pronunciation.update(request.spoken(), request.status(), request.date());
        return findById(id);
    }

    /**
     * Locks the word, refuses to delete its only stage, hands its sounds to a neighbour, then deletes.
     *
     * <p>The word lock makes concurrent deletions of its stages count one after the other, so two of
     * them can never remove the last two stages together, and keeps a new sound off the stage.</p>
     *
     * @param id stage identifier
     */
    @Override
    @Transactional
    public void delete(Long id) {
        Pronunciation pronunciation = findEntity(id);
        wordRepository.findForUpdateById(pronunciation.getWordId());
        List<PronunciationResponse> stages = pronunciationRepository.findResponsesByWordId(pronunciation.getWordId());
        if (stages.size() <= 1) {
            throw new ConflictException(
                LAST_PRONUNCIATION, "A word keeps at least one pronunciation: delete the word instead."
            );
        }
        pronunciationRepository.moveRecordings(id, heirOf(stages, id).id());
        pronunciationRepository.delete(pronunciation);
    }

    /**
     * Picks the stage receiving the sounds of a deleted one: the stage just before it, else just after.
     *
     * @param stages the word's stages, oldest first, at least two
     * @param id     stage being deleted
     * @return the heir stage
     */
    private static PronunciationResponse heirOf(List<PronunciationResponse> stages, Long id) {
        int index = 0;
        while (!stages.get(index).id().equals(id)) {
            index++;
        }
        return stages.get(index > 0 ? index - 1 : 1);
    }

    /**
     * Reads a stage entity.
     *
     * @param id stage identifier
     * @return the stage
     */
    private Pronunciation findEntity(Long id) {
        return pronunciationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
    }
}
