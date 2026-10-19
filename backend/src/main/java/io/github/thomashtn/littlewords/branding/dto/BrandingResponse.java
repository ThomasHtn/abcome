package io.github.thomashtn.littlewords.branding.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Name of the app, public so the login screen can show it before any session.
 *
 * @param name       name of the app, from {@code APP_NAME}
 * @param nameAccent end of the name drawn in the accent colour, from {@code APP_NAME_ACCENT}; empty for none
 */
@Schema(description = "Name of the app.")
public record BrandingResponse(
    @Schema(description = "Name of the app.", example = "ABCome") String name,
    @Schema(description = "End of the name drawn in the accent colour, empty for none.", example = "ome")
    String nameAccent
) {
}
