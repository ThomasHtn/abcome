package io.github.thomashtn.littlewords.export.dto;

import io.github.thomashtn.littlewords.dictionary.entity.WordCategory;
import io.github.thomashtn.littlewords.word.dto.PronunciationResponse;
import io.github.thomashtn.littlewords.word.entity.WordKind;
import java.time.Instant;
import java.util.List;

/**
 * Word or sentence in the archive, shaped like the API's, its sounds pointing to their files.
 *
 * @param id             word identifier
 * @param kind           word or sentence
 * @param label          the word itself, or what a sentence means
 * @param category       dictionary category, or custom
 * @param createdAt      instant it was added
 * @param pronunciations stages, oldest first
 * @param sounds         sounds, newest first
 */
public record ExportedEntry(
    Long id,
    WordKind kind,
    String label,
    WordCategory category,
    Instant createdAt,
    List<PronunciationResponse> pronunciations,
    List<ExportedSound> sounds
) {

    /**
     * Copies the lists so the entry stays immutable.
     */
    public ExportedEntry {
        pronunciations = List.copyOf(pronunciations);
        sounds = List.copyOf(sounds);
    }
}
