package io.github.thomashtn.abcome.word.repository;

import io.github.thomashtn.abcome.word.dto.PronunciationResponse;
import io.github.thomashtn.abcome.word.entity.Pronunciation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Access to the pronunciation stages; reads go through projections built straight by the query.
 *
 * <p>The sounds filed under a stage are moved here too, by entity name, which keeps this package free
 * of any dependency on the recording package.</p>
 */
public interface PronunciationRepository extends JpaRepository<Pronunciation, Long> {

    /**
     * Shared select of every projection below.
     */
    String SELECT_RESPONSE = """
        select new io.github.thomashtn.abcome.word.dto.PronunciationResponse(
            p.id, p.wordId, p.spoken, p.status, p.date)
        from Pronunciation p
        """;

    /**
     * Lists every stage of every word in one query, grouped by word then in stage order.
     *
     * @return all stages
     */
    @Query(SELECT_RESPONSE + " order by p.wordId, p.date, p.id")
    List<PronunciationResponse> findAllResponses();

    /**
     * Lists the stages of one word, oldest first.
     *
     * @param wordId word identifier
     * @return its stages
     */
    @Query(SELECT_RESPONSE + " where p.wordId = :wordId order by p.date, p.id")
    List<PronunciationResponse> findResponsesByWordId(@Param("wordId") Long wordId);

    /**
     * Reads one stage.
     *
     * @param id stage identifier
     * @return the stage, empty when unknown
     */
    @Query(SELECT_RESPONSE + " where p.id = :id")
    Optional<PronunciationResponse> findResponseById(@Param("id") Long id);

    /**
     * Files every sound of a stage under another one, without loading their bytes.
     *
     * @param from stage losing its sounds
     * @param to   stage receiving them
     * @return number of moved sounds
     */
    @Modifying
    @Query("update Recording r set r.pronunciationId = :to where r.pronunciationId = :from")
    int moveRecordings(@Param("from") Long from, @Param("to") Long to);
}
