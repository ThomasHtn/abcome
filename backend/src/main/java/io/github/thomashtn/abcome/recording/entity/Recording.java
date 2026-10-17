package io.github.thomashtn.abcome.recording.entity;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Sound of a word, stored as {@code bytea}; a word has any number of them.
 *
 * <p>This entity is only loaded to play a sound: word lists read its metadata through a projection
 * and never touch {@link #data}.</p>
 */
@Entity
@Table(name = "recording")
@SuppressFBWarnings(
    value = "EI_EXPOSE_REP",
    justification = "The audio bytes go straight from the request to the database and back; copying them would "
        + "only double the memory of a 2 MB upload."
)
public class Recording {

    /**
     * Database identifier; a new recording gets a new id, so its URL can be cached forever.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Word this sound belongs to; the database deletes the sound with its word.
     */
    @Column(name = "word_id", nullable = false, updatable = false)
    private Long wordId;

    /**
     * Audio bytes, as recorded by the browser.
     */
    @Column(name = "data", nullable = false, updatable = false)
    private byte[] data;

    /**
     * Audio type without codec parameters: {@code audio/webm} or {@code audio/mp4}.
     */
    @Column(name = "mime_type", nullable = false, updatable = false)
    private String mimeType;

    /**
     * Size of {@link #data}, kept so it can be reported without reading the bytes.
     */
    @Column(name = "size_bytes", nullable = false, updatable = false)
    private int sizeBytes;

    /**
     * Length of the sound, as measured by the browser.
     */
    @Column(name = "duration_ms", nullable = false, updatable = false)
    private int durationMs;

    /**
     * Instant the sound was saved.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Constructor required by JPA.
     */
    protected Recording() {
    }

    /**
     * Creates a recording.
     *
     * @param wordId     word it belongs to
     * @param data       audio bytes
     * @param mimeType   audio type without parameters
     * @param durationMs length in milliseconds
     * @param createdAt  creation instant
     */
    public Recording(Long wordId, byte[] data, String mimeType, int durationMs, Instant createdAt) {
        this.wordId = wordId;
        this.data = data;
        this.mimeType = mimeType;
        this.sizeBytes = data.length;
        this.durationMs = durationMs;
        this.createdAt = createdAt;
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
     * Returns the word it belongs to.
     *
     * @return word identifier
     */
    public Long getWordId() {
        return wordId;
    }

    /**
     * Returns the length of the sound.
     *
     * @return duration in milliseconds
     */
    public int getDurationMs() {
        return durationMs;
    }

    /**
     * Returns the instant the sound was saved.
     *
     * @return creation instant
     */
    public Instant getCreatedAt() {
        return createdAt;
    }

    /**
     * Returns the audio bytes.
     *
     * @return audio bytes
     */
    public byte[] getData() {
        return data;
    }

    /**
     * Returns the audio type.
     *
     * @return type without parameters
     */
    public String getMimeType() {
        return mimeType;
    }
}
