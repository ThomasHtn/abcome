package io.github.thomashtn.abcome.auth.service;

import io.github.thomashtn.abcome.shared.config.ApplicationProperties;
import io.github.thomashtn.abcome.shared.exception.TooManyRequestsException;
import io.github.thomashtn.abcome.shared.exception.UnauthorizedException;
import io.github.thomashtn.abcome.shared.security.PasswordFingerprint;
import io.github.thomashtn.abcome.shared.security.SessionFingerprintFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import java.util.concurrent.Semaphore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationTrustResolver;
import org.springframework.security.authentication.AuthenticationTrustResolverImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

/**
 * Family session backed by the Spring Security context stored in the HTTP session.
 */
@Service
public class DefaultAuthService implements AuthService {

    /**
     * Code of a wrong password.
     */
    static final String INVALID_CREDENTIALS = "INVALID_CREDENTIALS";

    /**
     * Application logger; failed attempts are logged with the address only, never the value sent.
     */
    private static final Logger LOGGER = LoggerFactory.getLogger(DefaultAuthService.class);

    /**
     * Name of the single principal: the whole family shares one password.
     */
    private static final String FAMILY_PRINCIPAL = "family";

    /**
     * Role of a signed-in family member.
     */
    private static final String FAMILY_ROLE = "ROLE_FAMILY";

    /**
     * Wait suggested when every password check slot is busy; a check takes well under a second.
     */
    private static final Duration BUSY_RETRY_AFTER = Duration.ofSeconds(1);

    /**
     * Tells a real sign-in from Spring Security's anonymous placeholder.
     */
    private final AuthenticationTrustResolver trustResolver = new AuthenticationTrustResolverImpl();

    /**
     * Argon2id hash of the family password.
     */
    private final String passwordHash;

    /**
     * Checks a password against the hash.
     */
    private final PasswordEncoder passwordEncoder;

    /**
     * Per-address lockout after repeated wrong passwords.
     */
    private final LoginAttemptLimiter attemptLimiter;

    /**
     * Stores the signed-in context in the session.
     */
    private final SecurityContextRepository securityContextRepository;

    /**
     * Fingerprint of the current password, written in the session.
     */
    private final PasswordFingerprint passwordFingerprint;

    /**
     * Slots for concurrent password checks: each Argon2 check holds the hash's memory cost.
     */
    private final Semaphore checkSlots;

    /**
     * Creates the service.
     *
     * @param properties                application settings holding the password hash
     * @param passwordEncoder           Argon2id encoder
     * @param attemptLimiter            per-address lockout
     * @param securityContextRepository session-backed context storage
     * @param passwordFingerprint       fingerprint of the current password
     */
    public DefaultAuthService(
        ApplicationProperties properties,
        PasswordEncoder passwordEncoder,
        LoginAttemptLimiter attemptLimiter,
        SecurityContextRepository securityContextRepository,
        PasswordFingerprint passwordFingerprint
    ) {
        this.passwordHash = properties.auth().passwordHash();
        this.passwordEncoder = passwordEncoder;
        this.attemptLimiter = attemptLimiter;
        this.securityContextRepository = securityContextRepository;
        this.passwordFingerprint = passwordFingerprint;
        this.checkSlots = new Semaphore(properties.auth().maxConcurrentChecks());
    }

    /**
     * Takes a check slot, counts the attempt (refused if locked out), checks the hash, then opens the session.
     *
     * @param password password typed by the family member
     * @param request  current request
     * @param response current response
     */
    @Override
    public void login(String password, HttpServletRequest request, HttpServletResponse response) {
        String address = request.getRemoteAddr();
        if (!checkSlots.tryAcquire()) {
            throw new TooManyRequestsException(BUSY_RETRY_AFTER, "Too many sign-ins at once. Try again.");
        }
        try {
            attemptLimiter.reserveAttempt(address).ifPresent(wait -> {
                throw new TooManyRequestsException(wait, "Too many wrong passwords. Try again later.");
            });
            if (!passwordEncoder.matches(password, passwordHash)) {
                LOGGER.warn("Wrong family password from {}", address);
                throw new UnauthorizedException(INVALID_CREDENTIALS, "Wrong password.");
            }
            attemptLimiter.recordSuccess(address);
        } finally {
            checkSlots.release();
        }
        openSession(request, response);
    }

    /**
     * Invalidates the session, which also expires its cookie.
     *
     * @param request current request
     */
    @Override
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    /**
     * Reads the security context of the current request.
     *
     * @return {@code true} when it holds the family, not the anonymous placeholder
     */
    @Override
    public boolean isSignedIn() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated()
            && !trustResolver.isAnonymous(authentication);
    }

    /**
     * Stores the family in a session whose id is new, so an id planted before login is worthless.
     *
     * @param request  current request
     * @param response current response
     */
    private void openSession(HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        HttpSession session = request.getSession(true);
        session.setAttribute(SessionFingerprintFilter.FINGERPRINT_ATTRIBUTE, passwordFingerprint.value());

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
            FAMILY_PRINCIPAL, null, AuthorityUtils.createAuthorityList(FAMILY_ROLE)
        ));
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }
}
