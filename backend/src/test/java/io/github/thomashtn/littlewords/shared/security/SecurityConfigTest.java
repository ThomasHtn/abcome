package io.github.thomashtn.littlewords.shared.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.littlewords.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies the security rules on the main port: probes are open, the actuator is absent, the API needs a session.
 */
class SecurityConfigTest extends PostgreSqlIntegrationTest {

    @Test
    @DisplayName("Reports itself ready on the main port only once the database answers, for the public probe")
    void exposesReadinessWithDatabase() throws Exception {
        mockMvc().perform(get("/readyz"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Reports itself alive on the main port, without a session")
    void exposesLiveness() throws Exception {
        mockMvc().perform(get("/livez"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Keeps the actuator off the main port, so a proxy routing mistake cannot publish it")
    void keepsActuatorOffMainPort() throws Exception {
        mockMvc().perform(get("/actuator/prometheus"))
            .andExpect(status().isNotFound());
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
