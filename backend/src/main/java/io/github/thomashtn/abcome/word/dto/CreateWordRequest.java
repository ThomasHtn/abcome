package io.github.thomashtn.abcome.word.dto;

import io.github.thomashtn.abcome.shared.text.Labels;
import io.github.thomashtn.abcome.shared.text.ReadableLabel;
import io.github.thomashtn.abcome.word.entity.WordKind;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * New word or sentence with its first stage: an entry never exists without one.
 *
 * <p>The size bound is a sentence's; a word's shorter limit is checked by the service, which knows the kind.</p>
 *
 * @param kind          word (the default) or sentence
 * @param label         the word itself or what the sentence means, cleaned of extra spaces before it is validated
 * @param pronunciation how Côme said it the first time
 */
@Schema(description = "New word or sentence with its first pronunciation stage.")
public record CreateWordRequest(
    @Schema(example = "word") WordKind kind,
    @Schema(example = "lapin") @NotBlank @Size(max = 200) @ReadableLabel String label,
    @NotNull @Valid PronunciationRequest pronunciation
) {

    /**
     * Cleans the label first, so its length is checked as it will be stored; a missing kind is a word.
     */
    public CreateWordRequest {
        kind = kind == null ? WordKind.WORD : kind;
        label = label == null ? null : Labels.clean(label);
    }
}
