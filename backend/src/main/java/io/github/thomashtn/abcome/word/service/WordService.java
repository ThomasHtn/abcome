package io.github.thomashtn.abcome.word.service;

import io.github.thomashtn.abcome.word.dto.CreateWordRequest;
import io.github.thomashtn.abcome.word.dto.UpdateWordRequest;
import io.github.thomashtn.abcome.word.dto.WordResponse;
import java.util.List;

/**
 * Words of the notebook, each with its stages and its sounds.
 */
public interface WordService {

    /**
     * Lists every word with its stages and sounds, in a fixed number of queries whatever the count.
     *
     * @return all words, in creation order
     */
    List<WordResponse> findAll();

    /**
     * Reads one word with its stages and sounds.
     *
     * @param id word identifier
     * @return the word
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     */
    WordResponse findById(Long id);

    /**
     * Locks a word until the caller's transaction ends, so a sound cannot be added to a word being deleted.
     *
     * @param id word identifier
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     * @throws org.springframework.transaction.IllegalTransactionStateException      outside a transaction
     */
    void lockForUpdate(Long id);

    /**
     * Adds a word with its first stage; its category comes from the dictionary.
     *
     * @param request label and first stage
     * @return the created word
     * @throws io.github.thomashtn.abcome.shared.exception.ConflictException       when the word already exists,
     *                                                                          whatever its case or accents
     * @throws io.github.thomashtn.abcome.shared.exception.InvalidRequestException when the date is in the future
     */
    WordResponse create(CreateWordRequest request);

    /**
     * Renames a word, for a typo; its stages stay.
     *
     * @param id      word identifier
     * @param request new label
     * @return the renamed word
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     * @throws io.github.thomashtn.abcome.shared.exception.ConflictException         when another word has this label
     */
    WordResponse rename(Long id, UpdateWordRequest request);

    /**
     * Deletes a word with its stages and recordings.
     *
     * @param id word identifier
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     */
    void delete(Long id);
}
