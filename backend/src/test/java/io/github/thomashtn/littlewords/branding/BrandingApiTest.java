package io.github.thomashtn.littlewords.branding;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.littlewords.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies the name of the app and the family's zone, read by the app before any session.
 */
class BrandingApiTest extends PostgreSqlIntegrationTest {

    @Test
    @DisplayName("Gives the default name, its accent and the family's zone to a visitor without a session")
    void givesNameToVisitor() throws Exception {
        mockMvc().perform(get("/api/branding"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Little Words"))
            .andExpect(jsonPath("$.nameAccent").value(""))
            .andExpect(jsonPath("$.timeZone").value("Europe/Paris"));
    }

    @Test
    @DisplayName("Names the home-screen manifest after the app, for a visitor without a session")
    void namesManifestAfterApp() throws Exception {
        mockMvc().perform(get("/api/branding/manifest"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("application/manifest+json"))
            .andExpect(jsonPath("$.name").value("Little Words"))
            .andExpect(jsonPath("$.short_name").value("Little Words"))
            .andExpect(jsonPath("$.start_url").value("/"))
            .andExpect(jsonPath("$.icons[0].src").value("/icons/icon-192.png"));
    }
}
