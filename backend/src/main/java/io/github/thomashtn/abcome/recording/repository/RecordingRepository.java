package io.github.thomashtn.abcome.recording.repository;

import io.github.thomashtn.abcome.recording.entity.Recording;
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
}
