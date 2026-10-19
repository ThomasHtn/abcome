package io.github.thomashtn.littlewords.branding;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.littlewords.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies the name of the app, read by the login screen before any session.
 */
class BrandingApiTest extends PostgreSqlIntegrationTest {

    @Test
    @DisplayName("Gives the default name and its accent to a visitor without a session")
    void givesNameToVisitor() throws Exception {
        mockMvc().perform(get("/api/branding"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("ABCome"))
            .andExpect(jsonPath("$.nameAccent").value("ome"));
    }
}
