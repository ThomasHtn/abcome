package io.github.thomashtn.abcome.word.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/**
 * One stage of a word: how the child said it on a given day.
 *
 * <p>The word is referenced by id rather than mapped as a relation: stages are always read in bulk
 * through projections, never navigated from a word.</p>
 */
@Entity
@Table(name = "pronunciation")
public class Pronunciation {

    /**
     * Database identifier.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Word this stage belongs to; the database deletes the stage with its word.
     */
    @Column(name = "word_id", nullable = false, updatable = false)
    private Long wordId;

    /**
     * What the child said, as the family writes it: "apin" for lapin.
     */
    @Column(name = "spoken", nullable = false)
    private String spoken;

    /**
     * How well he said it.
     */
    @Column(name = "status", nullable = false)
    private PronunciationStatus status;

    /**
     * Day he said it this way.
     */
    @Column(name = "date", nullable = false)
    private LocalDate date;

    /**
     * Instant the stage was noted.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Constructor required by JPA.
     */
    protected Pronunciation() {
    }

    /**
     * Creates a stage.
     *
     * @param wordId    word it belongs to
     * @param spoken    what the child said
     * @param status    how well he said it
     * @param date      day he said it
     * @param createdAt creation instant
     */
    public Pronunciation(Long wordId, String spoken, PronunciationStatus status, LocalDate date, Instant createdAt) {
        this.wordId = wordId;
        this.spoken = spoken;
        this.status = status;
        this.date = date;
        this.createdAt = createdAt;
    }

    /**
     * Rewrites the stage.
     *
     * @param newSpoken what the child said
     * @param newStatus how well he said it
     * @param newDate   day he said it
     */
    public void update(String newSpoken, PronunciationStatus newStatus, LocalDate newDate) {
        this.spoken = newSpoken;
        this.status = newStatus;
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
     * Returns the word this stage belongs to.
     *
     * @return word identifier
     */
    public Long getWordId() {
        return wordId;
    }
}
