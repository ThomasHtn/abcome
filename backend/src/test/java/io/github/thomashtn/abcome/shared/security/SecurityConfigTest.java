package io.github.thomashtn.abcome.shared.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.abcome.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Specifies the default security rules on the running application: health is open, the rest is shut.
 *
 * <p>API docs are pinned off so a developer's {@code .env} cannot open them during the test.</p>
 */
@TestPropertySource(properties = "app.api-docs-enabled=false")
class SecurityConfigTest extends PostgreSqlIntegrationTest {

    /**
     * Client sending requests through the whole filter chain.
     */
    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Starts on the migrated database and reports itself up on the public health endpoint")
    void exposesHealth() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Refuses an API route no rule opens, before it can reach any controller")
    void refusesUnknownApiRoute() throws Exception {
        mockMvc.perform(get("/api/words"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Refuses a write without a CSRF token")
    void refusesWriteWithoutCsrfToken() throws Exception {
        mockMvc.perform(post("/api/words"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Keeps Swagger UI closed while API docs are disabled, the production default")
    void hidesApiDocsByDefault() throws Exception {
        mockMvc.perform(get("/api-docs"))
            .andExpect(status().isForbidden());
    }
}
