package io.github.thomashtn.abcome.word.dto;

import io.github.thomashtn.abcome.shared.text.Labels;
import io.github.thomashtn.abcome.shared.text.ReadableLabel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * New label of a word, to fix a typo.
 *
 * @param label the word itself, cleaned of extra spaces before it is validated
 */
@Schema(description = "New label of a word.")
public record UpdateWordRequest(@Schema(example = "lapin") @NotBlank @Size(max = 40) @ReadableLabel String label) {

    /**
     * Cleans the label first, so its length is checked as it will be stored.
     */
    public UpdateWordRequest {
        label = label == null ? null : Labels.clean(label);
    }
}
