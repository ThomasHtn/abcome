package io.github.thomashtn.abcome.word.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

/**
 * What an entry of the notebook is: a word, or a sentence; both have stages and sounds alike.
 */
public enum WordKind {

    /**
     * A single word, its label unique in the notebook.
     */
    WORD("word", 40, 60),

    /**
     * A sentence, labelled by what Côme meant; two sentences may mean the same.
     */
    SENTENCE("sentence", 200, 200);

    /**
     * Code used in JSON and in the database.
     */
    private final String code;

    /**
     * Longest label, once cleaned.
     */
    private final int labelMaxLength;

    /**
     * Longest spoken form of a stage, once cleaned.
     */
    private final int spokenMaxLength;

    /**
     * Creates a kind.
     *
     * @param code            code used in JSON and in the database
     * @param labelMaxLength  longest label
     * @param spokenMaxLength longest spoken form
     */
    WordKind(String code, int labelMaxLength, int spokenMaxLength) {
        this.code = code;
        this.labelMaxLength = labelMaxLength;
        this.spokenMaxLength = spokenMaxLength;
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
     * Returns the longest label of this kind.
     *
     * @return number of characters
     */
    public int labelMaxLength() {
        return labelMaxLength;
    }

    /**
     * Returns the longest spoken form of a stage of this kind.
     *
     * @return number of characters
     */
    public int spokenMaxLength() {
        return spokenMaxLength;
    }

    /**
     * Reads a kind from its code.
     *
     * @param code lower-case code
     * @return the kind
     * @throws IllegalArgumentException when unknown
     */
    @JsonCreator
    public static WordKind fromCode(String code) {
        return Arrays.stream(values())
            .filter(kind -> kind.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown word kind."));
    }
}
