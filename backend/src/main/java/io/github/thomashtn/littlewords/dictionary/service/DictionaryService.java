package io.github.thomashtn.littlewords.dictionary.service;

import io.github.thomashtn.littlewords.dictionary.dto.DictionaryEntryResponse;
import io.github.thomashtn.littlewords.dictionary.entity.DictionaryLanguage;
import io.github.thomashtn.littlewords.dictionary.entity.WordCategory;
import java.util.List;

/**
 * Read-only dictionary of common first words.
 */
public interface DictionaryService {

    /**
     * Lists the dictionary of one language, earliest acquired words first.
     *
     * @param language language of the interface asking
     * @return every entry of that language
     */
    List<DictionaryEntryResponse> findAll(DictionaryLanguage language);

    /**
     * Finds the category of a word, whatever its case or accents, in any language's dictionary.
     *
     * @param label word as typed
     * @return its dictionary category, or {@link WordCategory#CUSTOM} when the dictionary does not know it
     */
    WordCategory categoryOf(String label);
}
