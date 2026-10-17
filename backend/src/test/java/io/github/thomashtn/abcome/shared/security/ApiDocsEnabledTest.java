package io.github.thomashtn.abcome.shared.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.abcome.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

/**
 * Specifies that the API docs flag opens the OpenAPI document, as in local development.
 */
@TestPropertySource(properties = "app.api-docs-enabled=true")
class ApiDocsEnabledTest extends PostgreSqlIntegrationTest {

    @Test
    @DisplayName("Serves the OpenAPI document with the ABCome title when API docs are enabled")
    void servesApiDocs() throws Exception {
        mockMvc().perform(get("/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.info.title").value("ABCome API"));
    }
}
