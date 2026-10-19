package io.github.thomashtn.littlewords.word.dto;

import io.github.thomashtn.littlewords.shared.text.Labels;
import io.github.thomashtn.littlewords.shared.text.ReadableLabel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * New label of a word or sentence, to fix a typo; the size bound is a sentence's, the service checks a word's.
 *
 * @param label the word itself or what the sentence means, cleaned of extra spaces before it is validated
 */
@Schema(description = "New label of a word or sentence.")
public record UpdateWordRequest(@Schema(example = "lapin") @NotBlank @Size(max = 200) @ReadableLabel String label) {

    /**
     * Cleans the label first, so its length is checked as it will be stored.
     */
    public UpdateWordRequest {
        label = label == null ? null : Labels.clean(label);
    }
}
