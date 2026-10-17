package io.github.thomashtn.abcome.dictionary.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

/**
 * IFDC category of a word, used to group suggestions; the frontend shows its French label.
 */
public enum WordCategory {

    /**
     * Sounds and onomatopoeia: vroum, miaou (bruits et onomatopées).
     */
    SOUNDS("sounds"),

    /**
     * Games and routines: coucou, bravo (jeux et routines).
     */
    GAMES_ROUTINES("games_routines"),

    /**
     * Vehicles (véhicules).
     */
    VEHICLES("vehicles"),

    /**
     * Animals, real or toys (animaux).
     */
    ANIMALS("animals"),

    /**
     * Toys (jouets).
     */
    TOYS("toys"),

    /**
     * Clothing (vêtements).
     */
    CLOTHING("clothing"),

    /**
     * Things outside: fleur, pluie (dehors).
     */
    OUTSIDE("outside"),

    /**
     * Places to go (lieux).
     */
    PLACES("places"),

    /**
     * Household objects (objets de la maison).
     */
    HOUSEHOLD("household"),

    /**
     * Parts of the body (corps).
     */
    BODY_PARTS("body_parts"),

    /**
     * Food and drink (à manger et à boire).
     */
    FOOD_DRINK("food_drink"),

    /**
     * Furniture and rooms (meubles et pièces).
     */
    FURNITURE_ROOMS("furniture_rooms"),

    /**
     * People: maman, nounou (personnes).
     */
    PEOPLE("people"),

    /**
     * Descriptive words: chaud, cassé (mots pour décrire).
     */
    DESCRIPTIVE_WORDS("descriptive_words"),

    /**
     * Action words: manger, dormir (actions).
     */
    ACTION_WORDS("action_words"),

    /**
     * Time words: demain, nuit (le temps).
     */
    TIME_WORDS("time_words"),

    /**
     * Helping verbs: veux, peux (petits verbes).
     */
    HELPING_VERBS("helping_verbs"),

    /**
     * Question words: où, quoi (questions).
     */
    QUESTION_WORDS("question_words"),

    /**
     * Prepositions and location words: là, dans (petits mots de lieu).
     */
    PREPOSITIONS("prepositions"),

    /**
     * Quantifiers: encore, pas (quantités).
     */
    QUANTIFIERS("quantifiers"),

    /**
     * Pronouns: moi, ça (pronoms).
     */
    PRONOUNS("pronouns"),

    /**
     * Connecting words: et, mais (mots de liaison).
     */
    CONNECTING_WORDS("connecting_words"),

    /**
     * Word the family added that the dictionary does not know (mot perso).
     */
    CUSTOM("custom");

    /**
     * Code used in JSON and in the database.
     */
    private final String code;

    /**
     * Creates a category.
     *
     * @param code code used in JSON and in the database
     */
    WordCategory(String code) {
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
     * Reads a category from its code.
     *
     * @param code lower-case code
     * @return matching category
     * @throws IllegalArgumentException for an unknown code, answered with 400 when it comes from JSON
     */
    @JsonCreator
    public static WordCategory fromCode(String code) {
        return Arrays.stream(values())
            .filter(category -> category.code.equals(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown word category."));
    }
}
