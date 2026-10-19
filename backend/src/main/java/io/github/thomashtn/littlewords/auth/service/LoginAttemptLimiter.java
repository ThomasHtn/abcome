package io.github.thomashtn.littlewords.auth.service;

import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Locks out, in memory, an address that sent too many wrong family passwords, for longer each time.
 *
 * <p>Argon2 makes each guess slow, not rare. The whole family shares one public address at home, so
 * a first lockout must stay short; doubling it at each new lockout still makes brute force
 * impractical. The application runs as a single instance, so memory is enough; a restart only
 * forgives the current history.</p>
 */
@Component
public class LoginAttemptLimiter {

    /**
     * Application logger, warning when the lockout is off.
     */
    private static final Logger LOGGER = LoggerFactory.getLogger(LoginAttemptLimiter.class);

    /**
     * Number of tracked addresses beyond which forgotten ones are swept before a new one is added.
     */
    private static final int SWEEP_THRESHOLD = 1_000;

    /**
     * Whether wrong passwords lock an address out; off in development only.
     */
    private final boolean enabled;

    /**
     * Attempts allowed for one address before it is locked out.
     */
    private final int maxFailures;

    /**
     * Length of an address's first lockout.
     */
    private final Duration initialLockout;

    /**
     * Longest lockout, and how long a quiet address keeps its history.
     */
    private final Duration maxLockout;

    /**
     * Clock timing the lockouts.
     */
    private final Clock clock;

    /**
     * Attempt history, keyed by remote address.
     */
    private final ConcurrentHashMap<String, AddressHistory> historyByAddress = new ConcurrentHashMap<>();

    /**
     * Creates the limiter.
     *
     * @param properties application settings holding the failure budget and lockout lengths
     * @param clock      application clock
     */
    public LoginAttemptLimiter(ApplicationProperties properties, Clock clock) {
        this.enabled = properties.auth().lockoutEnabled();
        this.maxFailures = properties.auth().maxFailures();
        this.initialLockout = properties.auth().initialLockout();
        this.maxLockout = properties.auth().maxLockout();
        this.clock = clock;
        if (!enabled) {
            LOGGER.warn("Login lockout disabled: development only");
        }
    }

    /**
     * Counts an attempt before its password is checked, or refuses it while the address is locked out.
     *
     * <p>Counting first, atomically, means parallel guesses cannot all pass the check before any of
     * them is recorded. The attempt that uses up the budget starts the lockout at once; if its
     * family password is right, {@link #recordSuccess} lifts it.</p>
     *
     * @param address caller's remote address
     * @return remaining wait when the address is locked out, empty when the attempt may go on
     *         (always empty when the lockout is disabled, nothing is counted then)
     */
    public Optional<Duration> reserveAttempt(String address) {
        if (!enabled) {
            return Optional.empty();
        }
        sweepForgottenAddresses();
        Instant now = clock.instant();
        AtomicBoolean granted = new AtomicBoolean();
        AddressHistory history = historyByAddress.compute(address, (key, existing) -> {
            AddressHistory current = existing == null || existing.isForgotten(now, maxLockout)
                ? AddressHistory.EMPTY
                : existing;
            if (current.isLockedOut(now)) {
                return current;
            }
            granted.set(true);
            return current.countAttempt(now, maxFailures, lockoutLength(current.lockouts() + 1));
        });
        if (granted.get()) {
            return Optional.empty();
        }
        return Optional.of(Duration.between(now, history.lockedUntil()));
    }

    /**
     * Forgets the attempts and lockouts of an address after a right family password.
     *
     * @param address caller's remote address
     */
    public void recordSuccess(String address) {
        historyByAddress.remove(address);
    }

    /**
     * Number of addresses currently tracked; for tests only, as nothing else reveals the sweep.
     *
     * @return count of tracked histories
     */
    int trackedAddressCount() {
        return historyByAddress.size();
    }

    /**
     * Length of the n-th lockout of an address: the first one, doubled at each next one, capped.
     *
     * @param lockoutNumber 1 for the first lockout
     * @return lockout length
     */
    private Duration lockoutLength(int lockoutNumber) {
        Duration length = initialLockout;
        for (int doubling = 1; doubling < lockoutNumber && length.compareTo(maxLockout) < 0; doubling++) {
            length = length.multipliedBy(2);
        }
        return length.compareTo(maxLockout) < 0 ? length : maxLockout;
    }

    /**
     * Drops forgotten addresses once many are tracked, so rotating addresses cannot grow the map.
     */
    private void sweepForgottenAddresses() {
        if (historyByAddress.size() < SWEEP_THRESHOLD) {
            return;
        }
        Instant now = clock.instant();
        historyByAddress.values().removeIf(history -> history.isForgotten(now, maxLockout));
    }

    /**
     * What is known of one address: attempts since its last lockout, and its lockouts so far.
     *
     * @param attempts    attempts counted since the last lockout ended
     * @param lockouts    lockouts so far
     * @param lockedUntil end of the current or last lockout, null before the first one
     * @param quietSince  instant from which a quiet address starts being forgotten, null when never seen
     */
    private record AddressHistory(int attempts, int lockouts, Instant lockedUntil, Instant quietSince) {

        /**
         * History of an address never seen, or forgotten.
         */
        static final AddressHistory EMPTY = new AddressHistory(0, 0, null, null);

        /**
         * Tells whether the address is locked out at this instant.
         *
         * @param now current instant
         * @return {@code true} before the end of its lockout
         */
        boolean isLockedOut(Instant now) {
            return lockedUntil != null && now.isBefore(lockedUntil);
        }

        /**
         * Counts one attempt, starting the next lockout when it uses up the budget.
         *
         * @param now         current instant
         * @param budget      attempts allowed before a lockout
         * @param nextLockout length of the lockout this attempt would start
         * @return updated history
         */
        AddressHistory countAttempt(Instant now, int budget, Duration nextLockout) {
            int counted = attempts + 1;
            if (counted < budget) {
                return new AddressHistory(counted, lockouts, lockedUntil, now);
            }
            Instant end = now.plus(nextLockout);
            return new AddressHistory(0, lockouts + 1, end, end);
        }

        /**
         * Tells whether the address has been quiet long enough to start afresh.
         *
         * @param now        current instant
         * @param quietSpell quiet time after which the history is forgotten
         * @return {@code true} once {@code quietSpell} has passed since the last attempt or lockout end
         */
        boolean isForgotten(Instant now, Duration quietSpell) {
            return quietSince != null && !now.isBefore(quietSince.plus(quietSpell));
        }
    }
}
