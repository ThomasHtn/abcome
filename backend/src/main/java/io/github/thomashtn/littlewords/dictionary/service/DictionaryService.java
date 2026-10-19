package io.github.thomashtn.littlewords.dictionary.service;

import io.github.thomashtn.littlewords.dictionary.dto.DictionaryEntryResponse;
import io.github.thomashtn.littlewords.dictionary.entity.WordCategory;
import java.util.List;

/**
 * Read-only dictionary of common first words.
 */
public interface DictionaryService {

    /**
     * Lists the whole dictionary, earliest acquired words first.
     *
     * @return every entry
     */
    List<DictionaryEntryResponse> findAll();

    /**
     * Finds the category of a word, whatever its case or accents.
     *
     * @param label word as typed
     * @return its dictionary category, or {@link WordCategory#CUSTOM} when the dictionary does not know it
     */
    WordCategory categoryOf(String label);
}
