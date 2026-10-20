package io.github.thomashtn.littlewords.branding.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Web app manifest, served by the API so the home-screen shortcut carries the name of each deployment.
 *
 * @param name            name under the home-screen icon, from {@code APP_NAME}
 * @param shortName       same name, for launchers short on room
 * @param startUrl        page opened by the shortcut
 * @param scope           pages that stay inside the installed app
 * @param display         browser chrome hidden, like an app
 * @param orientation     the screens are drawn for portrait
 * @param backgroundColor splash background while the app starts, the page background
 * @param themeColor      status bar colour, the page background
 * @param icons           home-screen icons, served by the frontend
 */
@Schema(description = "Web app manifest of the home-screen shortcut.")
public record WebManifestResponse(
    String name,
    @JsonProperty("short_name") String shortName,
    @JsonProperty("start_url") String startUrl,
    String scope,
    String display,
    String orientation,
    @JsonProperty("background_color") String backgroundColor,
    @JsonProperty("theme_color") String themeColor,
    List<Icon> icons
) {

    /**
     * Background of the app's pages, also its {@code theme-color} meta in {@code index.html}.
     */
    private static final String PAGE_BACKGROUND = "#fff9f6";

    /**
     * Icons of the frontend's {@code public/icons/}, absolute since the manifest is served under {@code /api}.
     */
    private static final List<Icon> ICONS = List.of(
        new Icon("/icons/icon-192.png", "192x192", "image/png", "any"),
        new Icon("/icons/icon-512.png", "512x512", "image/png", "any"),
        new Icon("/icons/icon-maskable-192.png", "192x192", "image/png", "maskable"),
        new Icon("/icons/icon-maskable-512.png", "512x512", "image/png", "maskable"),
        new Icon("/favicon.svg", "any", "image/svg+xml", "any")
    );

    /**
     * Copies the icons so the response stays immutable.
     */
    public WebManifestResponse {
        icons = List.copyOf(icons);
    }

    /**
     * Builds the manifest of an app called {@code name}.
     *
     * @param name name of the app, from {@code APP_NAME}
     * @return the manifest, every other member fixed
     */
    public static WebManifestResponse named(String name) {
        return new WebManifestResponse(
            name, name, "/", "/", "standalone", "portrait", PAGE_BACKGROUND, PAGE_BACKGROUND, ICONS);
    }

    /**
     * One home-screen icon.
     *
     * @param src     absolute path of the image
     * @param sizes   pixel sizes, or {@code any} for a vector image
     * @param type    media type of the image
     * @param purpose {@code maskable} when the launcher may crop it to its own shape
     */
    public record Icon(String src, String sizes, String type, String purpose) {
    }
}
