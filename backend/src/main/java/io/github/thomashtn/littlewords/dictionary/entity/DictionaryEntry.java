package io.github.thomashtn.littlewords.dictionary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;

/**
 * First word of a dictionary (IFDC for French, CDI for English), seeded by Flyway and never written by the
 * application.
 */
@Entity
@Table(name = "dictionary_entry")
@IdClass(DictionaryEntry.Key.class)
public class DictionaryEntry {

    /**
     * Code of the dictionary's language; kept as text because Hibernate converts no identifier.
     */
    @Id
    @Column(name = "language")
    private String language;

    /**
     * Word as shown, with its accents.
     */
    @Id
    @Column(name = "label")
    private String label;

    /**
     * Theme of the word.
     */
    @Column(name = "category", nullable = false)
    private WordCategory category;

    /**
     * Whether the word is offered as a shortcut on the add screen.
     */
    @Column(name = "frequent", nullable = false)
    private boolean frequent;

    /**
     * Order in which children usually say the words; the list is sorted by it.
     */
    @Column(name = "acquisition_rank", nullable = false)
    private int acquisitionRank;

    /**
     * Constructor required by JPA.
     */
    protected DictionaryEntry() {
    }

    /**
     * Returns the language of the dictionary holding the word.
     *
     * @return language
     */
    public DictionaryLanguage getLanguage() {
        return DictionaryLanguage.fromCode(language);
    }

    /**
     * Returns the word as shown.
     *
     * @return label with its accents
     */
    public String getLabel() {
        return label;
    }

    /**
     * Returns the theme of the word.
     *
     * @return category
     */
    public WordCategory getCategory() {
        return category;
    }

    /**
     * Tells whether the word is a shortcut on the add screen.
     *
     * @return {@code true} for a frequent word
     */
    public boolean isFrequent() {
        return frequent;
    }

    /**
     * Returns the acquisition order of the word.
     *
     * @return rank, 1 for the earliest word
     */
    public int getAcquisitionRank() {
        return acquisitionRank;
    }

    /**
     * Identifier of an entry: a label is unique within its language only.
     *
     * @param language code of the dictionary's language
     * @param label    word as shown
     */
    public record Key(String language, String label) implements Serializable {
    }
}
