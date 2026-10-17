package io.github.thomashtn.abcome.word.dto;

import io.github.thomashtn.abcome.word.entity.PronunciationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/**
 * Stage of a word.
 *
 * @param id     stage identifier
 * @param wordId word it belongs to
 * @param spoken what Côme said
 * @param status how well he said it
 * @param date   day he said it
 */
@Schema(description = "Pronunciation stage of a word.")
public record PronunciationResponse(
    @Schema(example = "12") Long id,
    @Schema(example = "3") Long wordId,
    @Schema(example = "apin") String spoken,
    @Schema(example = "almost") PronunciationStatus status,
    @Schema(example = "2026-10-12") LocalDate date
) {
}
