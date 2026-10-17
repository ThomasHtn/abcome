package io.github.thomashtn.abcome.word.dto;

import io.github.thomashtn.abcome.shared.text.Labels;
import io.github.thomashtn.abcome.word.entity.PronunciationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Stage to add or rewrite.
 *
 * @param spoken what Côme said, cleaned of extra spaces before it is validated
 * @param status how well he said it
 * @param date   day he said it, not in the future
 */
@Schema(description = "How Côme says a word on a given day.")
public record PronunciationRequest(
    @Schema(example = "apin") @NotBlank @Size(max = 60) String spoken,
    @Schema(example = "almost") @NotNull PronunciationStatus status,
    @Schema(example = "2026-10-12") @NotNull LocalDate date
) {

    /**
     * Cleans the spoken form first, so its length is checked as it will be stored.
     */
    public PronunciationRequest {
        spoken = spoken == null ? null : Labels.clean(spoken);
    }
}
