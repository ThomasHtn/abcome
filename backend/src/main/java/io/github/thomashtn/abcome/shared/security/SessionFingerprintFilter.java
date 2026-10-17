package io.github.thomashtn.abcome.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Ends any session opened with another password than the current one.
 *
 * <p>Sessions live in PostgreSQL and outlive a restart, so replacing {@code FAMILY_PASSWORD_HASH}
 * alone would not sign anyone out. Each session carries the fingerprint of the password that opened
 * it; a mismatch invalidates the session before anything reads its security context.</p>
 */
public class SessionFingerprintFilter extends OncePerRequestFilter {

    /**
     * Session attribute holding the fingerprint, written at login.
     */
    public static final String FINGERPRINT_ATTRIBUTE = "abcome.passwordFingerprint";

    /**
     * Fingerprint of the password currently configured.
     */
    private final PasswordFingerprint currentFingerprint;

    /**
     * Creates the filter.
     *
     * @param currentFingerprint fingerprint of the configured password hash
     */
    public SessionFingerprintFilter(PasswordFingerprint currentFingerprint) {
        this.currentFingerprint = currentFingerprint;
    }

    /**
     * Invalidates the session when it was not opened with the current password.
     *
     * @param request     current request
     * @param response    current response
     * @param filterChain rest of the chain
     * @throws ServletException when a later filter fails
     * @throws IOException      when writing the response fails
     */
    @Override
    protected void doFilterInternal(
        HttpServletRequest request, HttpServletResponse response, FilterChain filterChain
    ) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        // Sessions are only created at login, which always writes the fingerprint.
        if (session != null && !currentFingerprint.value().equals(session.getAttribute(FINGERPRINT_ATTRIBUTE))) {
            session.invalidate();
            SecurityContextHolder.clearContext();
        }
        filterChain.doFilter(request, response);
    }
}
