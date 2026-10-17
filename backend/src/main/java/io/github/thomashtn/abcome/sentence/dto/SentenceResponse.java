package io.github.thomashtn.abcome.sentence.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

/**
 * Sentence of the notebook.
 *
 * @param id      sentence identifier
 * @param spoken  what Côme said
 * @param meaning what he meant, null when unknown
 * @param date    day he said it
 */
@Schema(description = "Sentence Côme said.")
public record SentenceResponse(
    @Schema(example = "1") Long id,
    @Schema(example = "a pu ato") String spoken,
    @Schema(example = "Il n'y a plus de gâteau", nullable = true) String meaning,
    @Schema(example = "2026-10-14") LocalDate date
) {
}
