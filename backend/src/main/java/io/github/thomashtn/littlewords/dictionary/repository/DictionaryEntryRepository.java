package io.github.thomashtn.littlewords.dictionary.repository;

import io.github.thomashtn.littlewords.dictionary.entity.DictionaryEntry;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Read access to the seeded dictionary.
 */
public interface DictionaryEntryRepository extends JpaRepository<DictionaryEntry, DictionaryEntry.Key> {

    /**
     * Lists every entry of every language, earliest acquired words first.
     *
     * @return every dictionary
     */
    List<DictionaryEntry> findAllByOrderByAcquisitionRankAsc();
}
