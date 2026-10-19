package io.github.thomashtn.littlewords.dictionary.repository;

import io.github.thomashtn.littlewords.dictionary.entity.DictionaryEntry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Read access to the seeded dictionary.
 */
public interface DictionaryEntryRepository extends JpaRepository<DictionaryEntry, String> {

    /**
     * Lists every entry, earliest acquired words first.
     *
     * @return whole dictionary
     */
    List<DictionaryEntry> findAllByOrderByAcquisitionRankAsc();
}
