package io.github.thomashtn.abcome.word.dto;

import io.github.thomashtn.abcome.dictionary.entity.WordCategory;
import io.github.thomashtn.abcome.word.entity.WordKind;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

/**
 * Word or sentence with all its stages, sorted by date then id (the last one is its current status), and
 * its sounds.
 *
 * @param id             word identifier
 * @param kind           word or sentence
 * @param label          the word itself, or what a sentence means
 * @param category       dictionary category, or custom
 * @param createdAt      instant it was added
 * @param pronunciations stages, oldest first
 * @param recordings     sounds, newest first, without their bytes
 */
@Schema(description = "Word with its pronunciation stages, oldest first, and its sounds, newest first.")
public record WordResponse(
    @Schema(example = "3") Long id,
    @Schema(example = "word") WordKind kind,
    @Schema(example = "lapin") String label,
    @Schema(example = "animals") WordCategory category,
    Instant createdAt,
    List<PronunciationResponse> pronunciations,
    List<RecordingResponse> recordings
) {

    /**
     * Copies the lists so the response stays immutable.
     */
    public WordResponse {
        pronunciations = List.copyOf(pronunciations);
        recordings = List.copyOf(recordings);
    }
}
