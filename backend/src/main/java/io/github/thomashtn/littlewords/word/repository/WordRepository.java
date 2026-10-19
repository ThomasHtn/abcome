package io.github.thomashtn.littlewords.word.repository;

import io.github.thomashtn.littlewords.word.dto.RecordingResponse;
import io.github.thomashtn.littlewords.word.entity.Word;
import io.github.thomashtn.littlewords.word.entity.WordKind;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Access to the words of the notebook.
 *
 * <p>The sounds of the words are read here too, through a projection on the recording table by
 * name: it carries their metadata, never their bytes, and keeps this package free of any
 * dependency on the recording package.</p>
 */
public interface WordRepository extends JpaRepository<Word, Long> {

    /**
     * Shared select of the sound projections below.
     */
    String SELECT_RECORDING = """
        select new io.github.thomashtn.littlewords.word.dto.RecordingResponse(
            r.id, r.wordId, r.pronunciationId, r.mimeType, r.durationMs, r.createdAt)
        from Recording r
        """;

    /**
     * Gallery order: newest first, the id settling sounds saved in the same instant.
     */
    String RECORDING_ORDER = " order by r.createdAt desc, r.id desc";

    /**
     * Lists every word in creation order.
     *
     * @return all words
     */
    List<Word> findAllByOrderByIdAsc();

    /**
     * Tells whether an entry of this kind already uses this comparison key.
     *
     * @param kind            kind compared, words only in practice
     * @param normalizedLabel comparison key
     * @return {@code true} when taken
     */
    boolean existsByKindAndNormalizedLabel(WordKind kind, String normalizedLabel);

    /**
     * Tells whether another entry of this kind already uses this comparison key.
     *
     * @param kind            kind compared, words only in practice
     * @param normalizedLabel comparison key
     * @param id              entry being renamed, which may keep its own key
     * @return {@code true} when taken by another entry
     */
    boolean existsByKindAndNormalizedLabelAndIdNot(WordKind kind, String normalizedLabel, Long id);

    /**
     * Reads a word and locks its row until the transaction ends, so writers of its stages and sounds queue up.
     *
     * @param id word identifier
     * @return the word, empty when unknown
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Word w where w.id = :id")
    Optional<Word> findForUpdateById(@Param("id") Long id);

    /**
     * Lists the sounds of every word in one query, newest first.
     *
     * @return all sounds, without their bytes
     */
    @Query(SELECT_RECORDING + RECORDING_ORDER)
    List<RecordingResponse> findAllRecordings();

    /**
     * Lists the sounds of one word, newest first.
     *
     * @param wordId word identifier
     * @return its sounds, without their bytes
     */
    @Query(SELECT_RECORDING + " where r.wordId = :wordId" + RECORDING_ORDER)
    List<RecordingResponse> findRecordingsByWordId(@Param("wordId") Long wordId);
}
