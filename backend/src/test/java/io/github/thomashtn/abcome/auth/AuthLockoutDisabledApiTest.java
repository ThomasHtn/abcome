package io.github.thomashtn.abcome.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.abcome.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies the development switch that turns the login lockout off.
 */
@TestPropertySource(properties = "app.auth.lockout-enabled=false")
class AuthLockoutDisabledApiTest extends PostgreSqlIntegrationTest {

    @Test
    @DisplayName("Never locks an address out when the lockout is disabled: the right password still opens")
    void neverLocksOut() throws Exception {
        String address = "198.51.100.20";
        for (int attempt = 0; attempt < 12; attempt++) {
            login("wrong " + attempt, address).andExpect(status().isUnauthorized());
        }

        login(FAMILY_PASSWORD, address).andExpect(status().isOk());
    }

    /**
     * Sends a login from a given address.
     *
     * @param password password sent
     * @param address  caller's address
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions login(String password, String address) throws Exception {
        return mockMvc().perform(post("/api/auth/login")
            .with(xsrf())
            .with(remoteAddress(address))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"password\":\"" + password + "\"}"));
    }
}
