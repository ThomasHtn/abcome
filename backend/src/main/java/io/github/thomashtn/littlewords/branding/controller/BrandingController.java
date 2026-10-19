package io.github.thomashtn.littlewords.branding.controller;

import io.github.thomashtn.littlewords.branding.dto.BrandingResponse;
import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Name of the app and zone of the family, set per deployment so each family's notebook carries its own.
 */
@RestController
@RequestMapping("/api/branding")
@Tag(name = "Branding", description = "Name of the app and zone of the family, readable without a session.")
public class BrandingController {

    /**
     * Name, accent and zone, fixed at startup.
     */
    private final BrandingResponse branding;

    /**
     * Creates the controller.
     *
     * @param properties application settings, holding the app name and the family's zone
     */
    public BrandingController(ApplicationProperties properties) {
        this.branding = new BrandingResponse(
            properties.branding().name(), properties.branding().nameAccent(), properties.timeZone().getId());
    }

    /**
     * Gives the name of the app, shown on the login screen and in the page titles, and the zone in which
     * the app judges "today".
     *
     * @return the name, its accent and the zone
     */
    @GetMapping
    @Operation(summary = "Get the name of the app and the family's zone")
    @ApiResponse(responseCode = "200", description = "Name of the app and zone of the family.")
    public BrandingResponse branding() {
        return branding;
    }
}
