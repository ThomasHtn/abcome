package io.github.thomashtn.abcome.shared.security;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.abcome.shared.config.ApplicationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * HTTP security rules: everything is denied unless a rule below allows it.
 *
 * <p>No authentication mechanism exists yet; the family password login adds its own rules here.
 * The OpenAPI document stays off by default: it maps every route, payload and error code.</p>
 */
@Configuration
public class SecurityConfig {

    /**
     * Builds the application security filter chain.
     *
     * @param http       Spring Security HTTP configuration
     * @param properties application-level configuration properties
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
    SecurityFilterChain securityFilterChain(HttpSecurity http, ApplicationProperties properties) throws Exception {
        http.authorizeHttpRequests(authorize -> {
            authorize.requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll();

            // Same flag as springdoc, so the exception disappears with the routes it opens.
            if (properties.apiDocsEnabled()) {
                authorize.requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/api-docs",
                    "/api-docs/**"
                ).permitAll();
            }

            authorize.anyRequest().denyAll();
        });

        return http.build();
    }
}
