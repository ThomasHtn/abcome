package io.github.thomashtn.littlewords.word.service;

import io.github.thomashtn.littlewords.word.dto.CreateWordRequest;
import io.github.thomashtn.littlewords.word.dto.UpdateWordRequest;
import io.github.thomashtn.littlewords.word.dto.WordResponse;
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
     * @throws io.github.thomashtn.littlewords.shared.exception.ResourceNotFoundException when unknown
     */
    WordResponse findById(Long id);

    /**
     * Locks a word until the caller's transaction ends, so a sound cannot be added to a word being deleted.
     *
     * @param id word identifier
     * @throws io.github.thomashtn.littlewords.shared.exception.ResourceNotFoundException when unknown
     * @throws org.springframework.transaction.IllegalTransactionStateException      outside a transaction
     */
    void lockForUpdate(Long id);

    /**
     * Adds a word or a sentence with its first stage; a word's category comes from the dictionary.
     *
     * @param request kind, label and first stage
     * @return the created word or sentence
     * @throws io.github.thomashtn.littlewords.shared.exception.ConflictException       when the word already exists,
     *                                                                               whatever its case or accents
     * @throws io.github.thomashtn.littlewords.shared.exception.InvalidRequestException when the date is in the future,
     *                                                                               or a text too long for the kind
     */
    WordResponse create(CreateWordRequest request);

    /**
     * Renames a word or a sentence, for a typo; its stages stay.
     *
     * @param id      word identifier
     * @param request new label
     * @return the renamed word or sentence
     * @throws io.github.thomashtn.littlewords.shared.exception.ResourceNotFoundException when unknown
     * @throws io.github.thomashtn.littlewords.shared.exception.ConflictException         when another word
     *                                                                                    has this label
     * @throws io.github.thomashtn.littlewords.shared.exception.InvalidRequestException   when too long for the kind
     */
    WordResponse rename(Long id, UpdateWordRequest request);

    /**
     * Deletes a word with its stages and recordings.
     *
     * @param id word identifier
     * @throws io.github.thomashtn.littlewords.shared.exception.ResourceNotFoundException when unknown
     */
    void delete(Long id);
}
