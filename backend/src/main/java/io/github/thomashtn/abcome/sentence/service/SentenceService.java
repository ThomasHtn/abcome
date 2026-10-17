package io.github.thomashtn.abcome.sentence.service;

import io.github.thomashtn.abcome.sentence.dto.SentenceRequest;
import io.github.thomashtn.abcome.sentence.dto.SentenceResponse;
import java.util.List;

/**
 * Sentences of the notebook.
 */
public interface SentenceService {

    /**
     * Lists every sentence, newest first.
     *
     * @return all sentences
     */
    List<SentenceResponse> findAll();

    /**
     * Adds a sentence.
     *
     * @param request new sentence
     * @return the created sentence
     * @throws io.github.thomashtn.abcome.shared.exception.InvalidRequestException when the date is in the future
     */
    SentenceResponse create(SentenceRequest request);

    /**
     * Rewrites a sentence.
     *
     * @param id      sentence identifier
     * @param request new values
     * @return the updated sentence
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     * @throws io.github.thomashtn.abcome.shared.exception.InvalidRequestException   when the date is in the future
     */
    SentenceResponse update(Long id, SentenceRequest request);

    /**
     * Deletes a sentence.
     *
     * @param id sentence identifier
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     */
    void delete(Long id);
}
