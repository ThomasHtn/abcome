package io.github.thomashtn.littlewords.word.dto;

import io.github.thomashtn.littlewords.word.entity.PronunciationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Stage of a word.
 *
 * @param id        stage identifier
 * @param wordId    word it belongs to
 * @param spoken    what the child said
 * @param status    how well he said it
 * @param date      day he said it
 * @param createdAt instant it was noted, so a device can tell a stage added since it last looked
 */
@Schema(description = "Pronunciation stage of a word.")
public record PronunciationResponse(
    @Schema(example = "12") Long id,
    @Schema(example = "3") Long wordId,
    @Schema(example = "apin") String spoken,
    @Schema(example = "almost") PronunciationStatus status,
    @Schema(example = "2026-10-12") LocalDate date,
    @Schema(example = "2026-10-12T17:30:00Z") Instant createdAt
) {
}
