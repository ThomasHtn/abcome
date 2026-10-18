package io.github.thomashtn.abcome.recording.repository;

import io.github.thomashtn.abcome.recording.entity.Recording;
import io.github.thomashtn.abcome.word.dto.RecordingResponse;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Access to the recordings.
 */
public interface RecordingRepository extends JpaRepository<Recording, Long> {

    /**
     * Deletes one recording in one statement that never loads its bytes.
     *
     * @param id recording identifier
     * @return number of deleted rows, 0 when unknown
     */
    @Modifying
    @Query("delete from Recording r where r.id = :id")
    int deleteRecordingById(@Param("id") Long id);

    /**
     * Reads the word of a recording without loading its bytes.
     *
     * @param id recording identifier
     * @return word identifier, empty when unknown
     */
    @Query("select r.wordId from Recording r where r.id = :id")
    Optional<Long> findWordIdById(@Param("id") Long id);

    /**
     * Reads a recording's metadata without its bytes.
     *
     * @param id recording identifier
     * @return the sound, empty when unknown
     */
    @Query("""
        select new io.github.thomashtn.abcome.word.dto.RecordingResponse(
            r.id, r.wordId, r.pronunciationId, r.mimeType, r.durationMs, r.createdAt)
        from Recording r where r.id = :id
        """)
    Optional<RecordingResponse> findResponseById(@Param("id") Long id);

    /**
     * Files one recording under another stage, without loading its bytes.
     *
     * @param id              recording identifier
     * @param pronunciationId stage receiving it
     * @return number of updated rows
     */
    @Modifying(clearAutomatically = true)
    @Query("update Recording r set r.pronunciationId = :pronunciationId where r.id = :id")
    int moveTo(@Param("id") Long id, @Param("pronunciationId") Long pronunciationId);
}
