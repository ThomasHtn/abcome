package io.github.thomashtn.abcome.word.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Sound of a word, without its bytes: those are played from {@code /api/recordings/{id}}.
 *
 * <p>It lives with the word responses so the word package lists sounds without depending on the
 * recording package.</p>
 *
 * @param id         recording identifier
 * @param wordId     word it belongs to
 * @param mimeType   audio type, {@code audio/webm} or {@code audio/mp4}
 * @param durationMs length measured by the browser
 * @param createdAt  instant it was recorded
 */
@Schema(description = "Sound of a word, without its bytes.")
public record RecordingResponse(
    @Schema(example = "7") Long id,
    @Schema(example = "3") Long wordId,
    @Schema(example = "audio/webm") String mimeType,
    @Schema(example = "3200") int durationMs,
    Instant createdAt
) {
}
