package io.github.thomashtn.abcome.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

/**
 * Specifies that a session opened with another password is ended.
 */
class SessionFingerprintFilterTest {

    /**
     * Fingerprint of the password currently configured.
     */
    private final PasswordFingerprint current = PasswordFingerprint.of("$argon2id$current");

    /**
     * Filter under test.
     */
    private final SessionFingerprintFilter filter = new SessionFingerprintFilter(current);

    @Test
    @DisplayName("Keeps a session opened with the current password")
    void keepsCurrentSession() throws Exception {
        MockHttpSession session = sessionWith(current.value());

        filter.doFilter(requestWith(session), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(session.isInvalid()).isFalse();
    }

    @Test
    @DisplayName("Ends a session opened with a password that has since been replaced")
    void endsSessionOfOldPassword() throws Exception {
        MockHttpSession session = sessionWith(PasswordFingerprint.of("$argon2id$old").value());

        filter.doFilter(requestWith(session), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("Lets a request without session through untouched")
    void ignoresRequestWithoutSession() throws Exception {
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("Fingerprints a hash with SHA-256, never storing the hash itself")
    void fingerprintsWithSha256() {
        assertThat(current.value()).hasSize(64).doesNotContain("argon2id");
    }

    /**
     * Builds a session carrying a fingerprint.
     *
     * @param fingerprint fingerprint stored at login
     * @return session
     */
    private static MockHttpSession sessionWith(String fingerprint) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(SessionFingerprintFilter.FINGERPRINT_ATTRIBUTE, fingerprint);
        return session;
    }

    /**
     * Builds a request inside a session.
     *
     * @param session session of the request
     * @return request
     */
    private static MockHttpServletRequest requestWith(MockHttpSession session) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setSession(session);
        return request;
    }
}
