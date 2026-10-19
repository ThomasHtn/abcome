package io.github.thomashtn.littlewords.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies the memory budget of the family password hash.
 */
class PasswordHashCostTest {

    @Test
    @DisplayName("Accepts a hash costing 32 MiB or less, so two concurrent checks fit the heap")
    void acceptsAffordableHash() {
        assertThat(auth("$argon2id$v=19$m=32768,t=3,p=1$c2FsdA$aGFzaA").isAffordableHash()).isTrue();
        assertThat(auth("$argon2id$v=19$m=16384,t=2,p=1$c2FsdA$aGFzaA").isAffordableHash()).isTrue();
    }

    @Test
    @DisplayName("Refuses a hash costing 64 MiB, which a burst of logins would turn into an out-of-memory error")
    void refusesCostlyHash() {
        assertThat(auth("$argon2id$v=19$m=65536,t=3,p=1$c2FsdA$aGFzaA").isAffordableHash()).isFalse();
    }

    /**
     * Builds the auth settings around a hash.
     *
     * @param hash Argon2id PHC string
     * @return auth settings
     */
    private static ApplicationProperties.Auth auth(String hash) {
        return new ApplicationProperties.Auth(hash, "", 5, Duration.ofMinutes(1), Duration.ofMinutes(15), 2, true);
    }
}
