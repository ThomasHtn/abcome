package io.github.thomashtn.littlewords.auth.service;

import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import io.github.thomashtn.littlewords.shared.exception.TooManyRequestsException;
import io.github.thomashtn.littlewords.shared.exception.UnauthorizedException;
import io.github.thomashtn.littlewords.shared.security.PasswordFingerprint;
import io.github.thomashtn.littlewords.shared.security.Role;
import io.github.thomashtn.littlewords.shared.security.SessionFingerprintFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
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
 * Family session backed by the Spring Security context stored in the HTTP session, its role given by the
 * password typed.
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
     * Wait suggested when every password check slot is busy; a check takes well under a second.
     */
    private static final Duration BUSY_RETRY_AFTER = Duration.ofSeconds(1);

    /**
     * Tells a real sign-in from Spring Security's anonymous placeholder.
     */
    private final AuthenticationTrustResolver trustResolver = new AuthenticationTrustResolverImpl();

    /**
     * Argon2id hash of each configured password by the role it opens, the family one checked first.
     */
    private final Map<Role, String> passwordHashes;

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
     * Slots for concurrent password checks: each Argon2 check holds the hash's memory cost.
     */
    private final Semaphore checkSlots;

    /**
     * Creates the service.
     *
     * @param properties                application settings holding the password hashes
     * @param passwordEncoder           Argon2id encoder
     * @param attemptLimiter            per-address lockout
     * @param securityContextRepository session-backed context storage
     */
    public DefaultAuthService(
        ApplicationProperties properties,
        PasswordEncoder passwordEncoder,
        LoginAttemptLimiter attemptLimiter,
        SecurityContextRepository securityContextRepository
    ) {
        this.passwordHashes = properties.auth().passwordHashes();
        this.passwordEncoder = passwordEncoder;
        this.attemptLimiter = attemptLimiter;
        this.securityContextRepository = securityContextRepository;
        this.checkSlots = new Semaphore(properties.auth().maxConcurrentChecks());
    }

    /**
     * Takes a check slot, counts the attempt (refused if locked out), checks the hashes, then opens the session.
     *
     * @param password password typed by the family member
     * @param request  current request
     * @param response current response
     */
    @Override
    public void login(String password, HttpServletRequest request, HttpServletResponse response) {
        String address = request.getRemoteAddr();
        Optional<Role> role;
        if (!checkSlots.tryAcquire()) {
            throw new TooManyRequestsException(BUSY_RETRY_AFTER, "Too many sign-ins at once. Try again.");
        }
        try {
            attemptLimiter.reserveAttempt(address).ifPresent(wait -> {
                throw new TooManyRequestsException(wait, "Too many wrong passwords. Try again later.");
            });
            role = matchingRole(password);
            if (role.isEmpty()) {
                LOGGER.warn("Wrong password from {}", address);
                throw new UnauthorizedException(INVALID_CREDENTIALS, "Wrong password.");
            }
            // A reader's success keeps the count, or it would reset guesses at the family password.
            if (role.get() == Role.FAMILY) {
                attemptLimiter.recordSuccess(address);
            }
        } finally {
            checkSlots.release();
        }
        openSession(role.get(), request, response);
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
     * Looks for the family authority in the security context of the current request.
     *
     * @return {@code true} unless the context holds the family role
     */
    @Override
    public boolean isReadOnly() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null || authentication.getAuthorities().stream()
            .noneMatch(authority -> Role.FAMILY.authority().equals(authority.getAuthority()));
    }

    /**
     * Checks the password against each configured hash, the family one first.
     *
     * @param password password typed
     * @return role of the matching hash, or empty for a wrong password
     */
    private Optional<Role> matchingRole(String password) {
        return passwordHashes.entrySet().stream()
            .filter(entry -> passwordEncoder.matches(password, entry.getValue()))
            .map(Map.Entry::getKey)
            .findFirst();
    }

    /**
     * Stores the role in a session whose id is new, so an id planted before login is worthless.
     *
     * @param role     role opened by the password typed
     * @param request  current request
     * @param response current response
     */
    private void openSession(Role role, HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        HttpSession session = request.getSession(true);
        // Fingerprint of the hash that matched, so changing one password ends only the sessions it opened.
        session.setAttribute(
            SessionFingerprintFilter.FINGERPRINT_ATTRIBUTE, PasswordFingerprint.of(passwordHashes.get(role)).value()
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
            role.name().toLowerCase(Locale.ROOT), null, AuthorityUtils.createAuthorityList(role.authority())
        ));
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }
}
