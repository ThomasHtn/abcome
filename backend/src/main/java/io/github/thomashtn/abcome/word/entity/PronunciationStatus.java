package io.github.thomashtn.abcome.word.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

/**
 * How well the child says a word at a given stage; shown as red, orange or green.
 */
public enum PronunciationStatus {

    /**
     * Still far from the word, only the parents recognize it (red, "En route").
     */
    LEARNING("learning"),

    /**
     * Anyone recognizes it, a sound is still missing (orange, "Presque").
     */
    ALMOST("almost"),

    /**
     * Said like a grown-up (green, "Bien dit").
     */
    MASTERED("mastered");

    /**
     * Code used in JSON and in the database.
     */
    private final String code;

    /**
     * Creates a status.
     *
     * @param code code used in JSON and in the database
     */
    PronunciationStatus(String code) {
        this.code = code;
    }

    /**
     * Returns the code used in JSON and in the database.
     *
     * @return lower-case code
     */
    @JsonValue
    public String code() {
        return code;
    }

    /**
     * Reads a status from its code.
     *
     * @param code lower-case code
     * @return matching status
     * @throws IllegalArgumentException for an unknown code, answered with 400 when it comes from JSON
     */
    @JsonCreator
    public static PronunciationStatus fromCode(String code) {
        return Arrays.stream(values())
            .filter(status -> status.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown pronunciation status."));
    }
}
