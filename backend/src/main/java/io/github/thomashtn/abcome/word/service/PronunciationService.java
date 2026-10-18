package io.github.thomashtn.abcome.word.service;

import io.github.thomashtn.abcome.word.dto.PronunciationRequest;
import io.github.thomashtn.abcome.word.dto.PronunciationResponse;

/**
 * Pronunciation stages of the words.
 */
public interface PronunciationService {

    /**
     * Reads one stage.
     *
     * @param id stage identifier
     * @return the stage
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     */
    PronunciationResponse findById(Long id);

    /**
     * Adds a stage to a word: Côme says it differently now.
     *
     * @param wordId  word identifier
     * @param request new stage
     * @return the created stage
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when the word is unknown
     * @throws io.github.thomashtn.abcome.shared.exception.InvalidRequestException   when the date is in the future,
     *                                                                            or the spoken form too long
     */
    PronunciationResponse add(Long wordId, PronunciationRequest request);

    /**
     * Rewrites a stage.
     *
     * @param id      stage identifier
     * @param request new values
     * @return the updated stage
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     * @throws io.github.thomashtn.abcome.shared.exception.InvalidRequestException   when the date is in the future,
     *                                                                            or the spoken form too long
     */
    PronunciationResponse update(Long id, PronunciationRequest request);

    /**
     * Deletes a stage, unless it is the last stage of its word; the word's sounds stay.
     *
     * @param id stage identifier
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     * @throws io.github.thomashtn.abcome.shared.exception.ConflictException         for the only stage left
     */
    void delete(Long id);
}
