package io.github.thomashtn.abcome.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Ends any session opened with a password that is no longer configured.
 *
 * <p>Sessions live in PostgreSQL and outlive a restart, so replacing {@code FAMILY_PASSWORD_HASH} or
 * {@code READER_PASSWORD_HASH} alone would not sign anyone out. Each session carries the fingerprint of
 * the password that opened it; one matching no current password invalidates the session before anything
 * reads its security context.</p>
 */
public class SessionFingerprintFilter extends OncePerRequestFilter {

    /**
     * Session attribute holding the fingerprint, written at login.
     */
    public static final String FINGERPRINT_ATTRIBUTE = "abcome.passwordFingerprint";

    /**
     * Fingerprints of the passwords currently configured.
     */
    private final Set<String> currentFingerprints;

    /**
     * Creates the filter.
     *
     * @param currentFingerprints fingerprints of the configured password hashes
     */
    public SessionFingerprintFilter(Collection<PasswordFingerprint> currentFingerprints) {
        this.currentFingerprints = currentFingerprints.stream()
            .map(PasswordFingerprint::value)
            .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Invalidates the session when it was not opened with a current password.
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
        if (session != null && !isCurrent(session.getAttribute(FINGERPRINT_ATTRIBUTE))) {
            session.invalidate();
            SecurityContextHolder.clearContext();
        }
        filterChain.doFilter(request, response);
    }

    /**
     * Tells whether a session's fingerprint belongs to a configured password; the set refuses a null lookup.
     *
     * @param fingerprint session attribute, possibly missing
     * @return {@code true} for the fingerprint of a current password
     */
    private boolean isCurrent(Object fingerprint) {
        return fingerprint instanceof String value && currentFingerprints.contains(value);
    }
}
