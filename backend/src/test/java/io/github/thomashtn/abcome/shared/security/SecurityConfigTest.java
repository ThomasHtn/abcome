package io.github.thomashtn.abcome.shared.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.abcome.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

/**
 * Specifies the security rules on the running application: health is open, the API needs a session.
 *
 * <p>API docs are pinned off so a developer's {@code .env} cannot open them during the test.</p>
 */
@TestPropertySource(properties = "app.api-docs-enabled=false")
class SecurityConfigTest extends PostgreSqlIntegrationTest {

    @Test
    @DisplayName("Starts on the migrated database and reports itself up on the public health endpoint")
    void exposesHealth() throws Exception {
        mockMvc().perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Answers 401 UNAUTHENTICATED to an API call without a session, before any controller")
    void refusesApiWithoutSession() throws Exception {
        mockMvc().perform(get("/api/words"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("Refuses a path outside the API and the actuator, even inside a session")
    void refusesUnknownPath() throws Exception {
        mockMvc().perform(get("/admin").cookie(signIn()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("Refuses a write without a CSRF token, even inside a session")
    void refusesWriteWithoutCsrfToken() throws Exception {
        mockMvc().perform(post("/api/words").cookie(signIn()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("Keeps Swagger UI closed while API docs are disabled, the production default")
    void hidesApiDocsByDefault() throws Exception {
        mockMvc().perform(get("/api-docs"))
            .andExpect(status().isUnauthorized());
    }
}
