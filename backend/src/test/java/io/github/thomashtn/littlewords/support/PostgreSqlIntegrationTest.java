package io.github.thomashtn.littlewords.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base class for Spring tests, backed by one PostgreSQL 17 container shared by the whole suite.
 *
 * <p>Singleton container pattern: started once in a static initializer and reaped by Ryuk, so the
 * container outlives every test class instead of stopping after the first one. Tests run on the
 * production {@code application.properties}, Flyway included, with known family and reader passwords and child
 * name.</p>
 *
 * <p>spring-dotenv also reads the developer's {@code backend/.env} during tests, so the production
 * login lockout is pinned here; a subclass may override it with its own {@link TestPropertySource}.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.auth.lockout-enabled=true")
public abstract class PostgreSqlIntegrationTest {

    /**
     * Family password every test signs in with.
     */
    protected static final String FAMILY_PASSWORD = "une phrase de passe pour les tests";

    /**
     * Read-only password, for the tests of a relative who only looks.
     */
    protected static final String READER_PASSWORD = "une autre phrase pour les lecteurs";

    /**
     * Made-up first name of the child, so no real one ever sits in the repository.
     */
    protected static final String CHILD_NAME = "Alix";

    /**
     * Made-up birth date of the child.
     */
    protected static final String CHILD_BIRTH_DATE = "2025-05-12";

    /**
     * Name of the session cookie, as configured in {@code application.properties}.
     */
    protected static final String SESSION_COOKIE = "__Host-LITTLEWORDS_SESSION";

    /**
     * CSRF token the test client sends, in the cookie and the header, as Angular does.
     */
    private static final String XSRF_TOKEN = "test-xsrf-token";

    /**
     * Address of the signed-in test client; lockout tests use their own addresses.
     */
    private static final String CLIENT_ADDRESS = "192.0.2.1";

    /**
     * PostgreSQL container shared by every test class.
     */
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine");

    /**
     * Argon2id hash of {@link #FAMILY_PASSWORD}, computed once for the whole suite.
     */
    private static final String FAMILY_PASSWORD_HASH =
        Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8().encode(FAMILY_PASSWORD);

    /**
     * Argon2id hash of {@link #READER_PASSWORD}, computed once for the whole suite.
     */
    private static final String READER_PASSWORD_HASH =
        Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8().encode(READER_PASSWORD);

    static {
        POSTGRESQL.start();
    }

    /**
     * Client sending requests through the whole filter chain.
     */
    @Autowired
    private MockMvc mockMvc;

    /**
     * Direct database access, to reset the notebook between tests.
     */
    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Points the datasource at the shared container and sets both password hashes, the child name and birth date.
     *
     * @param registry Spring dynamic property registry
     */
    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
        registry.add("app.auth.password-hash", () -> FAMILY_PASSWORD_HASH);
        registry.add("app.auth.reader-password-hash", () -> READER_PASSWORD_HASH);
        registry.add("app.child-name", () -> CHILD_NAME);
        registry.add("app.child-birth-date", () -> CHILD_BIRTH_DATE);
    }

    /**
     * Returns the client sending requests through the whole filter chain.
     *
     * @return MockMvc client
     */
    protected MockMvc mockMvc() {
        return mockMvc;
    }

    /**
     * Empties the notebook; stages and recordings go with their words.
     */
    protected void clearNotebook() {
        jdbcTemplate.execute("TRUNCATE word RESTART IDENTITY CASCADE");
    }

    /**
     * Signs in with the family password and returns the session cookie.
     *
     * @return session cookie to send with the next requests
     * @throws Exception when the request fails
     */
    protected Cookie signIn() throws Exception {
        return signIn(FAMILY_PASSWORD);
    }

    /**
     * Signs in with the reader password and returns the read-only session cookie.
     *
     * @return session cookie to send with the next requests
     * @throws Exception when the request fails
     */
    protected Cookie signInAsReader() throws Exception {
        return signIn(READER_PASSWORD);
    }

    /**
     * Signs in with a password and returns the session cookie.
     *
     * @param password family or reader password
     * @return session cookie
     * @throws Exception when the request fails
     */
    private Cookie signIn(String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(xsrf())
                .with(remoteAddress(CLIENT_ADDRESS))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"" + password + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getCookie(SESSION_COOKIE);
    }

    /**
     * Sends the CSRF token the way the browser does: the {@code XSRF-TOKEN} cookie echoed in
     * {@code X-XSRF-TOKEN}.
     *
     * <p>Spring Security's own {@code csrf()} post-processor is not used: it swaps the shared
     * filter's repository for a session-backed one, which then leaks into every later request.</p>
     *
     * @return request post-processor
     */
    protected static RequestPostProcessor xsrf() {
        return request -> {
            Cookie[] existing = request.getCookies() == null ? new Cookie[0] : request.getCookies();
            Cookie[] cookies = Arrays.copyOf(existing, existing.length + 1);
            cookies[existing.length] = new Cookie("XSRF-TOKEN", XSRF_TOKEN);
            request.setCookies(cookies);
            request.addHeader("X-XSRF-TOKEN", XSRF_TOKEN);
            return request;
        };
    }

    /**
     * Sends a request from the given address, as the reverse proxy would report it.
     *
     * @param address remote address
     * @return request post-processor
     */
    protected static RequestPostProcessor remoteAddress(String address) {
        return request -> {
            request.setRemoteAddr(address);
            return request;
        };
    }
}
