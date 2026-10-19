package io.github.thomashtn.littlewords.dictionary.entity;

import java.util.Arrays;

/**
 * Language of a dictionary, the one the interface speaks: each has its own list of first words.
 */
public enum DictionaryLanguage {

    /**
     * French, from the IFDC.
     */
    FR("fr"),

    /**
     * English, from the American English CDI.
     */
    EN("en");

    /**
     * Code used in the query string and in the database.
     */
    private final String code;

    /**
     * Creates a language.
     *
     * @param code code used in the query string and in the database
     */
    DictionaryLanguage(String code) {
        this.code = code;
    }

    /**
     * Returns the code used in the query string and in the database.
     *
     * @return lower-case ISO 639-1 code
     */
    public String code() {
        return code;
    }

    /**
     * Reads a language from its code.
     *
     * @param code lower-case ISO 639-1 code
     * @return matching language
     * @throws IllegalArgumentException for an unknown code, answered with 400 when it comes from the query string
     */
    public static DictionaryLanguage fromCode(String code) {
        return Arrays.stream(values())
            .filter(language -> language.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown dictionary language."));
    }
}
