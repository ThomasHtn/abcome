package io.github.thomashtn.abcome.shared.text;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Cleans and compares the labels typed by the family, so "Bébé" and "bebe" are the same word.
 */
public final class Labels {

    /**
     * Runs of whitespace, collapsed to one space.
     */
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    /**
     * Combining marks left by the NFD decomposition: the accents.
     */
    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");

    /**
     * Not instantiable: static helpers only.
     */
    private Labels() {
    }

    /**
     * Trims a label and collapses its inner whitespace, keeping case and accents as typed.
     *
     * @param label label as typed
     * @return label as stored and shown
     */
    public static String clean(String label) {
        return WHITESPACE.matcher(label.strip()).replaceAll(" ");
    }

    /**
     * Reduces a label to its comparison key: cleaned, lower case, without accents or ligatures.
     *
     * @param label label as typed
     * @return key two spellings of the same word share
     */
    public static String normalize(String label) {
        String lowerCase = clean(label).toLowerCase(Locale.ROOT)
            .replace("œ", "oe")
            .replace("æ", "ae")
            .replace('’', '\'');
        return COMBINING_MARKS.matcher(Normalizer.normalize(lowerCase, Normalizer.Form.NFD)).replaceAll("");
    }
}
