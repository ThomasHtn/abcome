package io.github.thomashtn.abcome.recording.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * Stage a sound is moved to, another stage of the same word.
 *
 * @param pronunciationId stage receiving the sound
 */
@Schema(description = "Stage a sound is moved to, within its word.")
public record MoveRecordingRequest(@Schema(example = "12") @NotNull Long pronunciationId) {
}
