package io.github.thomashtn.abcome.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Open family session, carrying what the screens need and only a signed-in visitor may read.
 *
 * @param childName first name of the child, from {@code CHILD_NAME}
 * @param readOnly  whether the visitor signed in with the reader password, and so may only read
 */
@Schema(description = "Open family session.")
public record SessionResponse(
    @Schema(description = "First name of the child.", example = "Alix") String childName,
    @Schema(description = "Whether the visitor may only read the notebook.", example = "false") boolean readOnly
) {
}
