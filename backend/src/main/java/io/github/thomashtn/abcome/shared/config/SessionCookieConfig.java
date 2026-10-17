package io.github.thomashtn.abcome.shared.config;

import java.time.Duration;
import java.util.Objects;
import org.springframework.boot.session.autoconfigure.SessionProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

/**
 * Session cookie of the family, declared here rather than through {@code server.servlet.session.cookie.*}.
 *
 * <p>Spring Boot only applies those properties to Spring Session when it runs an embedded server;
 * a bean holds the same rules everywhere, tests included.</p>
 */
@Configuration
public class SessionCookieConfig {

    /**
     * Name of the session cookie; {@code __Host-} makes the browser refuse it unless it is Secure,
     * on path {@code /} and without {@code Domain}.
     */
    public static final String SESSION_COOKIE = "__Host-ABCOME_SESSION";

    /**
     * Writes the session cookie: unreadable by scripts, HTTPS only, never sent by another site.
     *
     * <p>Its lifetime is the session timeout ({@code spring.session.timeout}), so closing the browser or
     * the home-screen app does not sign the family out.</p>
     *
     * @param sessionProperties Spring Session settings holding the timeout
     * @return cookie serializer used by Spring Session
     */
    @Bean
    CookieSerializer cookieSerializer(SessionProperties sessionProperties) {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        Duration timeout = Objects.requireNonNull(sessionProperties.getTimeout(), "spring.session.timeout must be set");
        serializer.setCookieMaxAge(Math.toIntExact(timeout.toSeconds()));
        serializer.setCookieName(SESSION_COOKIE);
        serializer.setCookiePath("/");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(true);
        serializer.setSameSite("Strict");
        return serializer;
    }
}
