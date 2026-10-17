package io.github.thomashtn.abcome.dictionary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * First word of the IFDC-based dictionary, seeded by Flyway and never written by the application.
 */
@Entity
@Table(name = "dictionary_entry")
public class DictionaryEntry {

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
}
