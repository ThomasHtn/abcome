package io.github.thomashtn.abcome.sentence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Sentence Côme said, with what he meant when the family knows it.
 */
@Entity
@Table(name = "sentence")
public class Sentence {

    /**
     * Database identifier.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * What Côme said: "a pu ato".
     */
    @Column(name = "spoken", nullable = false)
    private String spoken;

    /**
     * What he meant, null when nobody is sure.
     */
    @Column(name = "meaning")
    private String meaning;

    /**
     * Day he said it.
     */
    @Column(name = "date", nullable = false)
    private LocalDate date;

    /**
     * Instant the sentence was noted.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Constructor required by JPA.
     */
    protected Sentence() {
    }

    /**
     * Creates a sentence.
     *
     * @param spoken    what Côme said
     * @param meaning   what he meant, or null
     * @param date      day he said it
     * @param createdAt creation instant
     */
    public Sentence(String spoken, String meaning, LocalDate date, Instant createdAt) {
        this.spoken = spoken;
        this.meaning = meaning;
        this.date = date;
        this.createdAt = createdAt;
    }

    /**
     * Rewrites the sentence.
     *
     * @param newSpoken  what Côme said
     * @param newMeaning what he meant, or null
     * @param newDate    day he said it
     */
    public void update(String newSpoken, String newMeaning, LocalDate newDate) {
        this.spoken = newSpoken;
        this.meaning = newMeaning;
        this.date = newDate;
    }

    /**
     * Returns the database identifier.
     *
     * @return identifier, null before the first save
     */
    public Long getId() {
        return id;
    }

    /**
     * Returns what Côme said.
     *
     * @return spoken sentence
     */
    public String getSpoken() {
        return spoken;
    }

    /**
     * Returns what he meant.
     *
     * @return meaning, or null
     */
    public String getMeaning() {
        return meaning;
    }

    /**
     * Returns the day he said it.
     *
     * @return date
     */
    public LocalDate getDate() {
        return date;
    }
}
