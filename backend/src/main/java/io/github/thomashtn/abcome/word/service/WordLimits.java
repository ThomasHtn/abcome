package io.github.thomashtn.abcome.word.service;

import io.github.thomashtn.abcome.shared.exception.InvalidRequestException;
import io.github.thomashtn.abcome.word.entity.WordKind;

/**
 * Length limits that depend on the kind: the requests only bound a sentence's, the longest.
 */
final class WordLimits {

    /**
     * Utility class.
     */
    private WordLimits() {
    }

    /**
     * Refuses a label too long for its kind.
     *
     * @param kind  word or sentence
     * @param label cleaned label
     * @throws InvalidRequestException when too long
     */
    static void checkLabel(WordKind kind, String label) {
        if (label.length() > kind.labelMaxLength()) {
            throw new InvalidRequestException("A " + kind.code() + " is at most " + kind.labelMaxLength()
                + " characters long.");
        }
    }

    /**
     * Refuses a spoken form too long for its kind.
     *
     * @param kind   word or sentence
     * @param spoken cleaned spoken form
     * @throws InvalidRequestException when too long
     */
    static void checkSpoken(WordKind kind, String spoken) {
        if (spoken.length() > kind.spokenMaxLength()) {
            throw new InvalidRequestException("What the child says of a " + kind.code() + " is at most "
                + kind.spokenMaxLength() + " characters long.");
        }
    }
}
