package io.github.thomashtn.littlewords.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import io.github.thomashtn.littlewords.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/**
 * Specifies the per-address lockout after wrong passwords, longer at each new lockout, and its off switch.
 */
@ExtendWith(OutputCaptureExtension.class)
class LoginAttemptLimiterTest {

    /**
     * Length of a first lockout.
     */
    private static final Duration FIRST_LOCKOUT = Duration.ofMinutes(1);

    /**
     * Longest lockout, and quiet time after which an address is forgotten.
     */
    private static final Duration MAX_LOCKOUT = Duration.ofMinutes(15);

    /**
     * Attempts allowed before a lockout.
     */
    private static final int BUDGET = 3;

    /**
     * Clock the tests move forward.
     */
    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-17T10:00:00Z"));

    /**
     * Limiter under test, with the lockout on as in production.
     */
    private final LoginAttemptLimiter limiter = limiter(true);

    @Test
    @DisplayName("Lets an address try while it stays within the attempt budget")
    void allowsWithinBudget() {
        assertThat(limiter.reserveAttempt("a")).isEmpty();
        assertThat(limiter.reserveAttempt("a")).isEmpty();
        assertThat(limiter.reserveAttempt("a")).isEmpty();
    }

    @Test
    @DisplayName("Locks an address out for one minute past the budget, tells the exact wait, spares other addresses")
    void locksOutPastBudget() {
        useBudget("a");
        clock.advance(Duration.ofSeconds(20));

        assertThat(limiter.reserveAttempt("a")).contains(Duration.ofSeconds(40));
        assertThat(limiter.reserveAttempt("b")).isEmpty();
    }

    @Test
    @DisplayName("Doubles each new lockout of the same address: 1, 2, 4, 8 minutes, then caps it at 15")
    void doublesLockoutsUpToCap() {
        List<Duration> lockouts = new ArrayList<>();
        for (int lockout = 0; lockout < 6; lockout++) {
            useBudget("a");
            Duration wait = limiter.reserveAttempt("a").orElseThrow();
            lockouts.add(wait);
            clock.advance(wait);
        }

        assertThat(lockouts).containsExactly(
            Duration.ofMinutes(1), Duration.ofMinutes(2), Duration.ofMinutes(4),
            Duration.ofMinutes(8), Duration.ofMinutes(15), Duration.ofMinutes(15)
        );
    }

    @Test
    @DisplayName("Gives a full budget again once a lockout is over")
    void restoresBudgetAfterLockout() {
        useBudget("a");
        clock.advance(FIRST_LOCKOUT);

        assertThat(limiter.reserveAttempt("a")).isEmpty();
        assertThat(limiter.reserveAttempt("a")).isEmpty();
        assertThat(limiter.reserveAttempt("a")).isEmpty();
        assertThat(limiter.reserveAttempt("a")).contains(Duration.ofMinutes(2));
    }

    @Test
    @DisplayName("Forgets the attempts and lockouts of an address after a right password")
    void resetsOnSuccess() {
        useBudget("a");
        clock.advance(FIRST_LOCKOUT);
        useBudget("a");
        clock.advance(Duration.ofMinutes(2));
        limiter.reserveAttempt("a");
        limiter.recordSuccess("a");

        useBudget("a");
        assertThat(limiter.reserveAttempt("a")).contains(FIRST_LOCKOUT);
    }

    @Test
    @DisplayName("Lifts a lockout started by the last attempt of the budget when that password is right")
    void liftsLockoutOnRightLastAttempt() {
        useBudget("a");
        limiter.recordSuccess("a");

        assertThat(limiter.reserveAttempt("a")).isEmpty();
    }

    @Test
    @DisplayName("Forgets the lockout history of an address that stays quiet for the longest lockout")
    void forgetsQuietAddress() {
        useBudget("a");
        clock.advance(FIRST_LOCKOUT);
        useBudget("a");
        clock.advance(Duration.ofMinutes(2).plus(MAX_LOCKOUT));

        useBudget("a");
        assertThat(limiter.reserveAttempt("a")).contains(FIRST_LOCKOUT);
    }

    @Test
    @DisplayName("Grants exactly the budget to parallel attempts from one address")
    void grantsBudgetUnderConcurrency() throws Exception {
        int callers = 32;
        ExecutorService executor = Executors.newFixedThreadPool(8);
        try {
            List<Callable<Optional<Duration>>> attempts = new ArrayList<>();
            for (int caller = 0; caller < callers; caller++) {
                attempts.add(() -> limiter.reserveAttempt("a"));
            }
            long granted = 0;
            for (Future<Optional<Duration>> result : executor.invokeAll(attempts)) {
                if (result.get().isEmpty()) {
                    granted++;
                }
            }

            assertThat(granted).isEqualTo(BUDGET);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("Sweeps forgotten addresses once many are tracked, so rotating addresses cannot grow memory")
    void sweepsForgottenAddresses() {
        for (int address = 0; address < 1_000; address++) {
            limiter.reserveAttempt("address-" + address);
        }
        clock.advance(MAX_LOCKOUT);

        limiter.reserveAttempt("newcomer");

        assertThat(limiter.trackedAddressCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Never locks out nor counts anything when the lockout is disabled, and warns once at startup")
    void neverLocksOutWhenDisabled(CapturedOutput output) {
        LoginAttemptLimiter disabled = limiter(false);

        for (int attempt = 0; attempt < BUDGET * 10; attempt++) {
            assertThat(disabled.reserveAttempt("a")).isEmpty();
        }
        assertThat(disabled.trackedAddressCount()).isZero();
        assertThat(output).contains("Login lockout disabled: development only");
    }

    @Test
    @DisplayName("Stays silent at startup when the lockout is on")
    void doesNotWarnWhenEnabled(CapturedOutput output) {
        limiter(true);

        assertThat(output).doesNotContain("Login lockout disabled");
    }

    /**
     * Builds a limiter on the test clock.
     *
     * @param lockoutEnabled whether wrong passwords lock an address out
     * @return limiter
     */
    private LoginAttemptLimiter limiter(boolean lockoutEnabled) {
        return new LoginAttemptLimiter(
            new ApplicationProperties(
                false,
                "Alix",
                ZoneId.of("Europe/Paris"),
                new ApplicationProperties.Auth(
                    "$argon2id$unused", "", BUDGET, FIRST_LOCKOUT, MAX_LOCKOUT, 2, lockoutEnabled
                ),
                new ApplicationProperties.Recording(1, 1, 1)
            ),
            clock
        );
    }

    /**
     * Spends the whole attempt budget of an address, which starts its next lockout.
     *
     * @param address address trying passwords
     */
    private void useBudget(String address) {
        for (int attempt = 0; attempt < BUDGET; attempt++) {
            assertThat(limiter.reserveAttempt(address)).isEmpty();
        }
    }
}
