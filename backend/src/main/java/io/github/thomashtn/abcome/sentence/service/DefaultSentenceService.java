package io.github.thomashtn.abcome.sentence.service;

import io.github.thomashtn.abcome.sentence.dto.SentenceRequest;
import io.github.thomashtn.abcome.sentence.dto.SentenceResponse;
import io.github.thomashtn.abcome.sentence.entity.Sentence;
import io.github.thomashtn.abcome.sentence.repository.SentenceRepository;
import io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException;
import io.github.thomashtn.abcome.shared.time.FamilyDates;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sentences stored in PostgreSQL.
 */
@Service
public class DefaultSentenceService implements SentenceService {

    /**
     * Sentence storage.
     */
    private final SentenceRepository sentenceRepository;

    /**
     * Application clock, in the family's zone.
     */
    private final Clock clock;

    /**
     * Creates the service.
     *
     * @param sentenceRepository sentence storage
     * @param clock              application clock
     */
    public DefaultSentenceService(SentenceRepository sentenceRepository, Clock clock) {
        this.sentenceRepository = sentenceRepository;
        this.clock = clock;
    }

    /**
     * Reads every sentence, newest first.
     *
     * @return all sentences
     */
    @Override
    @Transactional(readOnly = true)
    public List<SentenceResponse> findAll() {
        return sentenceRepository.findAllByOrderByDateDescIdDesc().stream()
            .map(DefaultSentenceService::toResponse)
            .toList();
    }

    /**
     * Checks the date, then saves the sentence.
     *
     * @param request new sentence
     * @return the created sentence
     */
    @Override
    @Transactional
    public SentenceResponse create(SentenceRequest request) {
        FamilyDates.assertNotInFuture(request.date(), clock);
        Sentence sentence = new Sentence(
            request.spoken(), meaningOf(request), request.date(), clock.instant()
        );
        return toResponse(sentenceRepository.save(sentence));
    }

    /**
     * Checks the date, then rewrites the sentence.
     *
     * @param id      sentence identifier
     * @param request new values
     * @return the updated sentence
     */
    @Override
    @Transactional
    public SentenceResponse update(Long id, SentenceRequest request) {
        Sentence sentence = findEntity(id);
        FamilyDates.assertNotInFuture(request.date(), clock);
        sentence.update(request.spoken(), meaningOf(request), request.date());
        return toResponse(sentence);
    }

    /**
     * Deletes the sentence.
     *
     * @param id sentence identifier
     */
    @Override
    @Transactional
    public void delete(Long id) {
        sentenceRepository.delete(findEntity(id));
    }

    /**
     * Reads a sentence entity.
     *
     * @param id sentence identifier
     * @return the sentence
     */
    private Sentence findEntity(Long id) {
        return sentenceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Sentence not found."));
    }

    /**
     * Reads the meaning; a blank one means nobody knows, stored as null.
     *
     * @param request sentence request, already cleaned
     * @return meaning, or null
     */
    private static String meaningOf(SentenceRequest request) {
        return request.meaning() == null || request.meaning().isBlank() ? null : request.meaning();
    }

    /**
     * Builds the response of a sentence.
     *
     * @param sentence sentence entity
     * @return its response
     */
    private static SentenceResponse toResponse(Sentence sentence) {
        return new SentenceResponse(sentence.getId(), sentence.getSpoken(), sentence.getMeaning(), sentence.getDate());
    }
}
