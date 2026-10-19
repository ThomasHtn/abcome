package io.github.thomashtn.abcome.shared.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.time.ZoneId;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Application settings under {@code app.*}, validated at startup so a bad value stops the boot.
 *
 * @param apiDocsEnabled whether the OpenAPI document and Swagger UI are served and reachable
 * @param childName      first name of the child, kept out of the repository and shown only after login
 * @param timeZone       zone of the family, in which "today" is judged
 * @param auth           family password and login lockout
 * @param recording      limits of an uploaded recording
 */
@Validated
@ConfigurationProperties("app")
public record ApplicationProperties(
    boolean apiDocsEnabled,
    @NotBlank(message = "CHILD_NAME must be set") String childName,
    @NotNull ZoneId timeZone,
    @NotNull @Valid Auth auth,
    @NotNull @Valid Recording recording
) {

    /**
     * Family password settings.
     *
     * <p>The hash is checked with {@link AssertTrue} rather than a pattern: a pattern failure would
     * print the rejected value at startup, and someone may have pasted the plain password.</p>
     *
     * @param passwordHash        Argon2id hash of the family password, in its PHC string form
     * @param maxFailures         wrong passwords allowed per address before a lockout
     * @param initialLockout      length of an address's first lockout; each next one doubles it
     * @param maxLockout          longest lockout, and how long a quiet address keeps its history
     * @param maxConcurrentChecks password checks allowed at once, each holding the hash's memory cost
     * @param lockoutEnabled      whether wrong passwords lock an address out; off in development only
     */
    public record Auth(
        @NotBlank(message = "FAMILY_PASSWORD_HASH must be set") String passwordHash,
        @Min(1) int maxFailures,
        @NotNull Duration initialLockout,
        @NotNull Duration maxLockout,
        @Min(1) int maxConcurrentChecks,
        boolean lockoutEnabled
    ) {

        /**
         * Highest Argon2 memory cost accepted, in KiB: two concurrent checks must fit the container's heap.
         */
        public static final int MAX_MEMORY_COST_KIB = 32_768;

        /**
         * Memory cost parameter of a PHC string, such as {@code m=32768}.
         */
        private static final Pattern MEMORY_COST = Pattern.compile("[$,]m=(\\d+)[,$]");

        /**
         * Tells whether the hash is an Argon2id one, the only algorithm the login accepts.
         *
         * @return {@code true} for an Argon2id PHC string, or a blank one already reported by {@link NotBlank}
         */
        @AssertTrue(message = "FAMILY_PASSWORD_HASH must be an Argon2id hash ($argon2id$...)")
        public boolean isArgon2idHash() {
            return passwordHash == null || passwordHash.isBlank() || passwordHash.startsWith("$argon2id$");
        }

        /**
         * Tells whether one check of the hash fits the memory budget, so a burst of logins cannot exhaust the heap.
         *
         * @return {@code true} when the memory cost is at most {@link #MAX_MEMORY_COST_KIB}, or not readable
         *         (a hash that is not Argon2id is already reported by {@link #isArgon2idHash()})
         */
        @AssertTrue(message = "FAMILY_PASSWORD_HASH costs too much memory: generate it with -m 15 or less")
        public boolean isAffordableHash() {
            if (passwordHash == null) {
                return true;
            }
            Matcher matcher = MEMORY_COST.matcher(passwordHash);
            return !matcher.find() || Long.parseLong(matcher.group(1)) <= MAX_MEMORY_COST_KIB;
        }

        /**
         * Tells whether the lockouts can grow: the cap must be positive and not below the first lockout.
         *
         * @return {@code true} when {@code 0 < initialLockout <= maxLockout}, or a value is missing
         *         (already reported by {@link NotNull})
         */
        @AssertTrue(message = "app.auth.initial-lockout must be positive and not above app.auth.max-lockout")
        public boolean isLockoutRangeValid() {
            return initialLockout == null || maxLockout == null
                || initialLockout.isPositive() && initialLockout.compareTo(maxLockout) <= 0;
        }

        /**
         * Hides the hash from logs and error reports that print the settings.
         *
         * @return settings without the hash
         */
        @Override
        public String toString() {
            return "Auth[maxFailures=" + maxFailures + ", initialLockout=" + initialLockout
                + ", maxLockout=" + maxLockout + ", maxConcurrentChecks=" + maxConcurrentChecks
                + ", lockoutEnabled=" + lockoutEnabled + "]";
        }
    }

    /**
     * Limits of an uploaded recording.
     *
     * @param maxBytes      largest accepted body, in bytes
     * @param minDurationMs shortest accepted duration, in milliseconds: shorter is a mistaken tap
     * @param maxDurationMs longest accepted duration, in milliseconds
     */
    public record Recording(@Min(1) int maxBytes, @Min(1) int minDurationMs, @Min(1) int maxDurationMs) {

        /**
         * Tells whether some duration can be accepted at all.
         *
         * @return {@code true} when the shortest duration does not exceed the longest
         */
        @AssertTrue(message = "app.recording.min-duration-ms must not exceed app.recording.max-duration-ms")
        public boolean isDurationRangeValid() {
            return minDurationMs <= maxDurationMs;
        }
    }
}
