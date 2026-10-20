package io.github.thomashtn.littlewords.export.dto;

import java.time.Instant;

/**
 * Sound in the archive: its details, and the path of its audio file there.
 *
 * @param id              recording identifier
 * @param pronunciationId stage it is filed under
 * @param file            path of its audio in the archive ({@code sounds/lapin/2026-10-12 apin (7).webm})
 * @param mimeType        audio type
 * @param durationMs      length measured by the browser
 * @param createdAt       instant it was recorded
 */
public record ExportedSound(
    Long id, Long pronunciationId, String file, String mimeType, int durationMs, Instant createdAt
) {
}
