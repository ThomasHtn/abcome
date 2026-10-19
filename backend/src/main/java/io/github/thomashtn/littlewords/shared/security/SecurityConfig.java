package io.github.thomashtn.littlewords.shared.security;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import io.github.thomashtn.littlewords.shared.exception.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.savedrequest.NullRequestCache;
import tools.jackson.databind.ObjectMapper;

/**
 * HTTP security rules: a session opened by the family or the reader password, CSRF on every write, deny by default.
 *
 * <p>Login, logout, the session check and the app name are open; every other {@code /api/**} read needs a session,
 * every write a family one; anything else is refused. The OpenAPI document stays off by default: it maps every route,
 * payload and error code.</p>
 */
@Configuration
public class SecurityConfig {

    /**
     * Routes reachable without a session: the ones that open, check or close it.
     */
    private static final String[] AUTH_ROUTES = {"/api/auth/session", "/api/auth/login", "/api/auth/logout"};

    /**
     * Checks the family password against its Argon2id hash.
     *
     * <p>The parameters here only matter to {@code encode}; {@code matches} reads the memory, time
     * and parallelism cost from the stored hash itself, so a hash from the {@code argon2} CLI works.</p>
     *
     * @return password encoder
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    /**
     * Stores the signed-in security context in the HTTP session, itself kept in PostgreSQL.
     *
     * @return security context repository, shared by the filter chain and the login service
     */
    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    /**
     * Builds the application security filter chain.
     *
     * @param http                      Spring Security HTTP configuration
     * @param properties                application-level configuration properties
     * @param securityContextRepository where the signed-in context lives
     * @param objectMapper              application JSON mapper, so refusals match the controllers' errors
     * @param clock                     application clock stamping refusals
     * @return the configured security filter chain
     * @throws Exception when Spring Security cannot build the chain
     */
    @Bean
    @SuppressFBWarnings(
        value = "THROWS_METHOD_THROWS_CLAUSE_BASIC_EXCEPTION",
        justification = """
            Spring Security's HttpSecurity configuration and build API declares
            Exception. Narrowing the checked exception is not possible without
            wrapping framework exceptions and losing their original semantics.
            """
    )
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        ApplicationProperties properties,
        SecurityContextRepository securityContextRepository,
        ObjectMapper objectMapper,
        Clock clock
    ) throws Exception {
        http
            // Cookie token readable by Angular, sent back in X-XSRF-TOKEN; HTTPS only, never cross-site.
            .csrf(csrf -> csrf.spa().csrfTokenRepository(csrfTokenRepository()))
            .securityContext(context -> context.securityContextRepository(securityContextRepository))
            // A refused anonymous request must not create a session just to remember itself.
            .requestCache(cache -> cache.requestCache(new NullRequestCache()))
            // Logout is a documented API route, see AuthController.
            .logout(logout -> logout.disable())
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, exception) -> writeProblem(
                    objectMapper, clock, request, response,
                    HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Sign in to open the notebook."
                ))
                .accessDeniedHandler((request, response, exception) -> writeProblem(
                    objectMapper, clock, request, response,
                    HttpStatus.FORBIDDEN, "FORBIDDEN", "This request is not allowed."
                ))
            )
            .authorizeHttpRequests(authorize -> {
                // Open to probes: /livez and /readyz only tell up or down; the actuator lives on the management port.
                authorize
                    .requestMatchers(
                        "/livez", "/readyz",
                        "/actuator/health", "/actuator/health/**", "/actuator/info", "/actuator/prometheus"
                    ).permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/auth/session", "/api/branding").permitAll()
                    .requestMatchers(HttpMethod.POST, AUTH_ROUTES).permitAll();

                // Same flag as springdoc, so the exception disappears with the routes it opens.
                if (properties.apiDocsEnabled()) {
                    authorize.requestMatchers(
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/api-docs",
                        "/api-docs/**"
                    ).permitAll();
                }

                // A reader session reads the notebook; only a family one changes it.
                authorize
                    .requestMatchers(HttpMethod.GET, "/api/**").authenticated()
                    .requestMatchers("/api/**").hasRole(Role.FAMILY.name())
                    .anyRequest().denyAll();
            })
            .addFilterAfter(
                new SessionFingerprintFilter(currentFingerprints(properties)), SecurityContextHolderFilter.class
            );

        return http.build();
    }

    /**
     * Fingerprints of the configured passwords: a session opened with any other one is ended.
     *
     * @param properties application settings holding the hashes
     * @return one fingerprint per configured password
     */
    private static List<PasswordFingerprint> currentFingerprints(ApplicationProperties properties) {
        return properties.auth().passwordHashes().values().stream().map(PasswordFingerprint::of).toList();
    }

    /**
     * Stores the CSRF token in the {@code XSRF-TOKEN} cookie Angular reads, as {@code spa()} does,
     * but Secure and SameSite=Strict like the session cookie.
     *
     * @return CSRF token repository
     */
    private static CookieCsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer(cookie -> cookie.secure(true).sameSite("Strict"));
        return repository;
    }

    /**
     * Writes a refusal of the security chain in the same shape as the controllers' errors.
     *
     * @param objectMapper JSON mapper
     * @param clock        clock stamping the refusal
     * @param request      refused request
     * @param response     response to write
     * @param status       HTTP status
     * @param code         stable application code
     * @param detail       caller-facing explanation
     * @throws IOException when the response cannot be written
     */
    private static void writeProblem(
        ObjectMapper objectMapper,
        Clock clock,
        HttpServletRequest request,
        HttpServletResponse response,
        HttpStatus status,
        String code,
        String detail
    ) throws IOException {
        ApiErrorResponse body = ApiErrorResponse.of(status, code, detail, request.getRequestURI(), clock.instant());
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
