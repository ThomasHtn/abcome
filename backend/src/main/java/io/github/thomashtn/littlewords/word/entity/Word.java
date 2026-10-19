package io.github.thomashtn.littlewords.word.entity;

import io.github.thomashtn.littlewords.dictionary.entity.WordCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Word or sentence the child says; its stages are {@link Pronunciation} rows, loaded separately to avoid N+1
 * queries.
 */
@Entity
@Table(name = "word")
public class Word {

    /**
     * Database identifier.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Word as typed by the family, cleaned of extra spaces.
     */
    @Column(name = "label", nullable = false)
    private String label;

    /**
     * Comparison key, unique: lower case, without accents.
     */
    @Column(name = "normalized_label", nullable = false)
    private String normalizedLabel;

    /**
     * Dictionary category, or custom.
     */
    @Column(name = "category", nullable = false)
    private WordCategory category;

    /**
     * Word or sentence; never changes.
     */
    @Column(name = "kind", nullable = false, updatable = false)
    private WordKind kind;

    /**
     * Instant the word was added to the notebook.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Constructor required by JPA.
     */
    protected Word() {
    }

    /**
     * Creates a word or a sentence.
     *
     * @param kind            word or sentence
     * @param label           cleaned label
     * @param normalizedLabel comparison key
     * @param category        dictionary category, custom for a sentence
     * @param createdAt       creation instant
     */
    public Word(WordKind kind, String label, String normalizedLabel, WordCategory category, Instant createdAt) {
        this.kind = kind;
        this.label = label;
        this.normalizedLabel = normalizedLabel;
        this.category = category;
        this.createdAt = createdAt;
    }

    /**
     * Renames the word; its category follows the new label.
     *
     * @param newLabel           cleaned label
     * @param newNormalizedLabel comparison key of the new label
     * @param newCategory        dictionary category of the new label
     */
    public void rename(String newLabel, String newNormalizedLabel, WordCategory newCategory) {
        this.label = newLabel;
        this.normalizedLabel = newNormalizedLabel;
        this.category = newCategory;
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
     * Returns the word as shown.
     *
     * @return cleaned label
     */
    public String getLabel() {
        return label;
    }

    /**
     * Returns the comparison key.
     *
     * @return normalized label
     */
    public String getNormalizedLabel() {
        return normalizedLabel;
    }

    /**
     * Returns the dictionary category.
     *
     * @return category
     */
    public WordCategory getCategory() {
        return category;
    }

    /**
     * Returns whether this is a word or a sentence.
     *
     * @return the kind
     */
    public WordKind getKind() {
        return kind;
    }

    /**
     * Returns the instant the word was added.
     *
     * @return creation instant
     */
    public Instant getCreatedAt() {
        return createdAt;
    }
}
