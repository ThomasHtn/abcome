package io.github.thomashtn.abcome.word.dto;

import io.github.thomashtn.abcome.shared.text.Labels;
import io.github.thomashtn.abcome.shared.text.ReadableLabel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * New word with its first stage: a word never exists without one.
 *
 * @param label         the word itself, cleaned of extra spaces before it is validated
 * @param pronunciation how Côme said it the first time
 */
@Schema(description = "New word with its first pronunciation stage.")
public record CreateWordRequest(
    @Schema(example = "lapin") @NotBlank @Size(max = 40) @ReadableLabel String label,
    @NotNull @Valid PronunciationRequest pronunciation
) {

    /**
     * Cleans the label first, so its length is checked as it will be stored.
     */
    public CreateWordRequest {
        label = label == null ? null : Labels.clean(label);
    }
}
