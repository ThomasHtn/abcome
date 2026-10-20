package io.github.thomashtn.littlewords.branding.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Name of the app and zone of the family, public so the login screen can show the name before any session.
 *
 * @param name       name of the app, from {@code APP_NAME}
 * @param nameAccent end of the name drawn in the accent colour, from {@code APP_NAME_ACCENT}; empty for none
 * @param timeZone   zone of the family, from {@code APP_TIME_ZONE}, so the app judges "today" as the API does
 */
@Schema(description = "Name of the app and zone of the family.")
public record BrandingResponse(
    @Schema(description = "Name of the app.", example = "Little Words") String name,
    @Schema(description = "End of the name drawn in the accent colour, empty for none.", example = "Words")
    String nameAccent,
    @Schema(description = "Zone of the family, in which \"today\" is judged.", example = "Europe/Paris")
    String timeZone
) {
}
