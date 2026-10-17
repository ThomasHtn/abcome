package io.github.thomashtn.abcome.sentence.dto;

import io.github.thomashtn.abcome.shared.text.Labels;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Sentence to add or rewrite.
 *
 * @param spoken  what Côme said, cleaned of extra spaces before it is validated
 * @param meaning what he meant, cleaned the same way; blank or absent when unknown
 * @param date    day he said it, not in the future
 */
@Schema(description = "Sentence Côme said.")
public record SentenceRequest(
    @Schema(example = "a pu ato") @NotBlank @Size(max = 200) String spoken,
    @Schema(example = "Il n'y a plus de gâteau", nullable = true) @Size(max = 200) String meaning,
    @Schema(example = "2026-10-14") @NotNull LocalDate date
) {

    /**
     * Cleans both texts first, so their lengths are checked as they will be stored.
     */
    public SentenceRequest {
        spoken = spoken == null ? null : Labels.clean(spoken);
        meaning = meaning == null ? null : Labels.clean(meaning);
    }
}
