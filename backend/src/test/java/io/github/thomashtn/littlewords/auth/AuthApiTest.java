package io.github.thomashtn.littlewords.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.littlewords.support.PostgreSqlIntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies the family session: check, login, lockout and logout.
 */
class AuthApiTest extends PostgreSqlIntegrationTest {

    @Test
    @DisplayName("Answers 401 UNAUTHENTICATED to a visitor and hands it the CSRF cookie for its login")
    void checksSessionOfVisitor() throws Exception {
        mockMvc().perform(get("/api/auth/session"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
            .andExpect(cookie().exists("XSRF-TOKEN"))
            .andExpect(cookie().httpOnly("XSRF-TOKEN", false))
            .andExpect(cookie().secure("XSRF-TOKEN", true))
            .andExpect(cookie().sameSite("XSRF-TOKEN", "Strict"))
            .andExpect(cookie().doesNotExist(SESSION_COOKIE));
    }

    @Test
    @DisplayName("Refuses a login whose CSRF header does not match its cookie")
    void refusesMismatchedCsrf() throws Exception {
        mockMvc().perform(post("/api/auth/login")
                .cookie(new Cookie("XSRF-TOKEN", "one"))
                .header("X-XSRF-TOKEN", "another")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"" + FAMILY_PASSWORD + "\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("Opens a session with the family password, in a __Host- cookie that is HttpOnly, Secure, Strict "
        + "and kept 30 days, and answers with the child's name")
    void signsIn() throws Exception {
        String setCookie = login(FAMILY_PASSWORD, "203.0.113.10")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.childName").value(CHILD_NAME))
            .andExpect(jsonPath("$.readOnly").value(false))
            .andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);

        assertThat(setCookie)
            .startsWith(SESSION_COOKIE + "=")
            .contains("Path=/", "Secure", "HttpOnly", "SameSite=Strict", "Max-Age=2592000")
            .doesNotContain("Domain");
    }

    @Test
    @DisplayName("Answers 200 with the child's name to a session check inside a session")
    void checksSessionOfFamilyMember() throws Exception {
        mockMvc().perform(get("/api/auth/session").cookie(signIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.childName").value(CHILD_NAME))
            .andExpect(jsonPath("$.readOnly").value(false));
    }

    @Test
    @DisplayName("Opens a read-only session with the reader password, and says so at login and at each check")
    void signsInAsReader() throws Exception {
        Cookie session = login(READER_PASSWORD, "203.0.113.13")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.childName").value(CHILD_NAME))
            .andExpect(jsonPath("$.readOnly").value(true))
            .andReturn().getResponse().getCookie(SESSION_COOKIE);

        mockMvc().perform(get("/api/auth/session").cookie(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.readOnly").value(true));
    }

    @Test
    @DisplayName("Renews the session cookie for 30 days at each session check, so only 30 idle days sign out")
    void renewsSessionCookieOnCheck() throws Exception {
        Cookie session = signIn();

        String setCookie = mockMvc().perform(get("/api/auth/session").cookie(session))
            .andExpect(status().isOk())
            .andReturn().getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
            .filter(header -> header.startsWith(SESSION_COOKIE + "="))
            .findFirst().orElse("");

        assertThat(setCookie)
            .startsWith(SESSION_COOKIE + "=" + session.getValue() + ";")
            .contains("Path=/", "Secure", "HttpOnly", "SameSite=Strict", "Max-Age=2592000");
    }

    @Test
    @DisplayName("Refuses a wrong password with 401 INVALID_CREDENTIALS and no session")
    void refusesWrongPassword() throws Exception {
        login("not the password", "203.0.113.11")
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
            .andExpect(cookie().doesNotExist(SESSION_COOKIE));
    }

    @Test
    @DisplayName("Refuses an empty password with 400 INVALID_REQUEST")
    void refusesEmptyPassword() throws Exception {
        login(" ", "203.0.113.12")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("Refuses a login without CSRF token with 403")
    void refusesLoginWithoutCsrf() throws Exception {
        mockMvc().perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"" + FAMILY_PASSWORD + "\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Locks an address out a minute after five wrong passwords, even for the right one, with Retry-After")
    void locksOutAfterFiveFailures() throws Exception {
        String address = "198.51.100.7";
        for (int attempt = 0; attempt < 5; attempt++) {
            login("wrong " + attempt, address).andExpect(status().isUnauthorized());
        }

        String retryAfter = login(FAMILY_PASSWORD, address)
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"))
            .andReturn().getResponse().getHeader(HttpHeaders.RETRY_AFTER);
        assertThat(Long.parseLong(retryAfter)).isBetween(1L, 60L);

        login(FAMILY_PASSWORD, "198.51.100.8").andExpect(status().isOk());
    }

    @Test
    @DisplayName("Keeps counting wrong passwords after a reader login, so it cannot reset guesses at the family one")
    void readerLoginKeepsFailures() throws Exception {
        String address = "198.51.100.9";
        for (int attempt = 0; attempt < 3; attempt++) {
            login("wrong " + attempt, address).andExpect(status().isUnauthorized());
        }
        login(READER_PASSWORD, address).andExpect(status().isOk());
        login("wrong again", address).andExpect(status().isUnauthorized());

        login(FAMILY_PASSWORD, address).andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("Lifts the count after a family login")
    void familyLoginLiftsFailures() throws Exception {
        String address = "198.51.100.10";
        for (int attempt = 0; attempt < 4; attempt++) {
            login("wrong " + attempt, address).andExpect(status().isUnauthorized());
        }
        login(FAMILY_PASSWORD, address).andExpect(status().isOk());

        login("wrong again", address).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Gives a new session id at login, so an id known before login is worthless")
    void changesSessionIdAtLogin() throws Exception {
        Cookie before = signIn();

        Cookie after = mockMvc().perform(post("/api/auth/login")
                .cookie(before)
                .with(xsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"" + FAMILY_PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getCookie(SESSION_COOKIE);

        assertThat(after).isNotNull();
        assertThat(after.getValue()).isNotEqualTo(before.getValue());
    }

    @Test
    @DisplayName("Closes the session at logout, so its cookie no longer opens the notebook")
    void signsOut() throws Exception {
        Cookie session = signIn();

        mockMvc().perform(post("/api/auth/logout").cookie(session).with(xsrf()))
            .andExpect(status().isNoContent());

        mockMvc().perform(get("/api/auth/session").cookie(session))
            .andExpect(status().isUnauthorized());
        mockMvc().perform(get("/api/words").cookie(session))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Accepts a logout without session, so signing out twice is not an error")
    void signsOutTwice() throws Exception {
        mockMvc().perform(post("/api/auth/logout").with(xsrf()))
            .andExpect(status().isNoContent())
            .andExpect(header().doesNotExist(HttpHeaders.RETRY_AFTER));
    }

    /**
     * Sends a login from the given address.
     *
     * @param password password to send
     * @param address  remote address of the caller
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
