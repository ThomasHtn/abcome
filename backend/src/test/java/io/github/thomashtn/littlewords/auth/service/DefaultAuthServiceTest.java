package io.github.thomashtn.littlewords.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import io.github.thomashtn.littlewords.shared.exception.TooManyRequestsException;
import io.github.thomashtn.littlewords.shared.exception.UnauthorizedException;
import io.github.thomashtn.littlewords.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

/**
 * Specifies how the login bounds concurrent password checks.
 */
class DefaultAuthServiceTest {

    /**
     * Hash placeholder; the stub encoder never reads it.
     */
    private static final String HASH = "$argon2id$v=19$m=16384,t=2,p=1$c2FsdA$aGFzaA";

    /**
     * Password checks allowed at once in these tests.
     */
    private static final int SLOTS = 2;

    /**
     * Holds every password check until the test lets them finish.
     */
    private final CountDownLatch releaseChecks = new CountDownLatch(1);

    /**
     * Counts the checks that have started, so the test knows every slot is taken.
     */
    private final CountDownLatch checksStarted = new CountDownLatch(SLOTS);

    /**
     * Encoder that blocks like a slow Argon2 check, then rejects the password.
     */
    private final PasswordEncoder slowEncoder = new PasswordEncoder() {

        /**
         * Never called by the login.
         *
         * @param rawPassword password
         * @return nothing
         */
        @Override
        public String encode(CharSequence rawPassword) {
            throw new UnsupportedOperationException();
        }

        /**
         * Blocks until released, then answers a wrong password.
         *
         * @param rawPassword     password typed
         * @param encodedPassword stored hash
         * @return always {@code false}
         */
        @Override
        public boolean matches(CharSequence rawPassword, String encodedPassword) {
            checksStarted.countDown();
            try {
                releaseChecks.await(10, TimeUnit.SECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
            return false;
        }
    };

    /**
     * Settings with a generous failure budget, so only the slots limit the test.
     */
    private final ApplicationProperties properties = new ApplicationProperties(
        false,
        "Alix",
        null,
        new ApplicationProperties.Branding("ABCome", "ome"),
        ZoneId.of("Europe/Paris"),
        new ApplicationProperties.Auth(HASH, "", 100, Duration.ofMinutes(1), Duration.ofMinutes(15), SLOTS, true),
        new ApplicationProperties.Recording(1, 1, 1)
    );

    /**
     * Service under test.
     */
    private final DefaultAuthService service = new DefaultAuthService(
        properties,
        slowEncoder,
        new LoginAttemptLimiter(properties, new MutableClock(Instant.parse("2026-10-17T10:00:00Z"))),
        new HttpSessionSecurityContextRepository()
    );

    @Test
    @DisplayName("Refuses a login with 429 while every password check slot is busy, then accepts again")
    void refusesWhenSlotsAreBusy() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(SLOTS);
        try {
            Future<?> first = executor.submit(() -> login("first"));
            Future<?> second = executor.submit(() -> login("second"));
            assertThat(checksStarted.await(10, TimeUnit.SECONDS)).isTrue();

            assertThatThrownBy(() -> login("third"))
                .isInstanceOf(TooManyRequestsException.class)
                .extracting(error -> ((TooManyRequestsException) error).getRetryAfter())
                .isEqualTo(Duration.ofSeconds(1));

            releaseChecks.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS)).isInstanceOf(UnauthorizedException.class);
            assertThat(second.get(10, TimeUnit.SECONDS)).isInstanceOf(UnauthorizedException.class);
            assertThat(login("fourth")).isInstanceOf(UnauthorizedException.class);
        } finally {
            releaseChecks.countDown();
            executor.shutdownNow();
        }
    }

    /**
     * Sends a wrong password from its own address.
     *
     * @param address caller's remote address
     * @return the error the login raised, or {@code null} if it succeeded
     */
    private RuntimeException login(String address) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(address);
        try {
            service.login("wrong", request, new MockHttpServletResponse());
            return null;
        } catch (UnauthorizedException exception) {
            return exception;
        }
    }
}
