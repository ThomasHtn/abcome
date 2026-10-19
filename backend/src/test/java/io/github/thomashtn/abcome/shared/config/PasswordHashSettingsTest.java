package io.github.thomashtn.abcome.shared.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.thomashtn.abcome.shared.security.Role;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

/**
 * Specifies how {@code FAMILY_PASSWORD_HASH} and {@code READER_PASSWORD_HASH} are read and checked at startup.
 */
class PasswordHashSettingsTest {

    /**
     * Argon2id hash in the PHC form the {@code argon2} CLI prints, full of {@code $} signs.
     */
    private static final String HASH = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8().encode("secret words");

    /**
     * Context binding only the application settings, with the other keys valid.
     */
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withUserConfiguration(SettingsOnly.class)
        .withPropertyValues(
            "app.child-name=Alix",
            "app.time-zone=Europe/Paris",
            "app.auth.max-failures=5",
            "app.auth.initial-lockout=PT1M",
            "app.auth.max-lockout=PT15M",
            "app.auth.max-concurrent-checks=2",
            "app.recording.max-bytes=2097152",
            "app.recording.min-duration-ms=300",
            "app.recording.max-duration-ms=15000"
        );

    @Test
    @DisplayName("Starts with an Argon2id hash and keeps it out of the settings' description")
    void acceptsArgon2idHash() {
        runner.withPropertyValues("app.auth.password-hash=" + HASH).run(context -> {
            assertThat(context).hasNotFailed();
            ApplicationProperties properties = context.getBean(ApplicationProperties.class);
            assertThat(properties.auth().passwordHash()).isEqualTo(HASH);
            assertThat(properties.toString()).doesNotContain(HASH);
        });
    }

    @Test
    @DisplayName("Starts without a reader hash, with the family password as the only way in")
    void acceptsMissingReaderHash() {
        runner.withPropertyValues("app.auth.password-hash=" + HASH, "app.auth.reader-password-hash=").run(context -> {
            assertThat(context).hasNotFailed();
            ApplicationProperties properties = context.getBean(ApplicationProperties.class);
            assertThat(properties.auth().passwordHashes()).containsOnlyKeys(Role.FAMILY);
        });
    }

    @Test
    @DisplayName("Opens the reader sign-in with an Argon2id reader hash, checked after the family one")
    void acceptsReaderHash() {
        String readerHash = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8().encode("other words");
        runner.withPropertyValues("app.auth.password-hash=" + HASH, "app.auth.reader-password-hash=" + readerHash)
            .run(context -> {
                assertThat(context).hasNotFailed();
                ApplicationProperties properties = context.getBean(ApplicationProperties.class);
                assertThat(properties.auth().passwordHashes()).containsExactly(
                    entry(Role.FAMILY, HASH), entry(Role.READER, readerHash)
                );
                assertThat(properties.toString()).doesNotContain(readerHash);
            });
    }

    @Test
    @DisplayName("Refuses a plain reader password pasted by mistake, or a costly reader hash, naming its variable")
    void refusesInvalidReaderHash() {
        runner.withPropertyValues("app.auth.password-hash=" + HASH, "app.auth.reader-password-hash=our reader secret")
            .run(context -> {
                assertThat(context).hasFailed();
                assertThat(failureMessages(context.getStartupFailure()))
                    .contains("READER_PASSWORD_HASH must be an Argon2id hash")
                    .doesNotContain("our reader secret");
            });
        String costly = "$argon2id$v=19$m=65536,t=3,p=1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaA";
        runner.withPropertyValues("app.auth.password-hash=" + HASH, "app.auth.reader-password-hash=" + costly)
            .run(context -> {
                assertThat(context).hasFailed();
                assertThat(failureMessages(context.getStartupFailure())).contains("READER_PASSWORD_HASH costs");
            });
    }

    @Test
    @DisplayName("Refuses to start without a hash, naming the variable to set")
    void refusesMissingHash() {
        runner.withPropertyValues("app.auth.password-hash=").run(context -> {
            assertThat(context).hasFailed();
            assertThat(failureMessages(context.getStartupFailure())).contains("FAMILY_PASSWORD_HASH must be set");
        });
    }

    @Test
    @DisplayName("Refuses a plain password pasted by mistake, without ever printing it")
    void refusesPlainPassword() {
        runner.withPropertyValues("app.auth.password-hash=our family secret").run(context -> {
            assertThat(context).hasFailed();
            assertThat(failureMessages(context.getStartupFailure()))
                .contains("Argon2id")
                .doesNotContain("our family secret");
        });
    }

    @Test
    @DisplayName("Refuses to start with a hash costing 64 MiB per check, naming the lighter cost to use")
    void refusesCostlyHash() {
        String costly = "$argon2id$v=19$m=65536,t=3,p=1$c2FsdHNhbHRzYWx0$aGFzaGhhc2hoYXNoaGFzaA";
        runner.withPropertyValues("app.auth.password-hash=" + costly).run(context -> {
            assertThat(context).hasFailed();
            assertThat(failureMessages(context.getStartupFailure())).contains("-m 15");
        });
    }

    @Test
    @DisplayName("Refuses to start when the first lockout is longer than the cap, or not positive")
    void refusesInvalidLockoutRange() {
        runner.withPropertyValues("app.auth.password-hash=" + HASH, "app.auth.initial-lockout=PT20M").run(context -> {
            assertThat(context).hasFailed();
            assertThat(failureMessages(context.getStartupFailure())).contains("app.auth.initial-lockout");
        });
        runner.withPropertyValues("app.auth.password-hash=" + HASH, "app.auth.initial-lockout=PT0S").run(context -> {
            assertThat(context).hasFailed();
        });
    }

    @Test
    @DisplayName("Refuses to start when the shortest recording is longer than the longest")
    void refusesInvalidDurationRange() {
        runner.withPropertyValues("app.auth.password-hash=" + HASH, "app.recording.min-duration-ms=20000")
            .run(context -> {
                assertThat(context).hasFailed();
                assertThat(failureMessages(context.getStartupFailure())).contains("app.recording.min-duration-ms");
            });
    }

    @Test
    @DisplayName("Reads the hash verbatim from backend/.env when unquoted or double-quoted, not single-quoted")
    void readsHashFromDotenv(@TempDir Path directory) throws IOException {
        Files.writeString(directory.resolve(".env"), String.join("\n",
            "UNQUOTED=" + HASH,
            "DOUBLE_QUOTED=\"" + HASH + "\"",
            "SINGLE_QUOTED='" + HASH + "'"
        ), StandardCharsets.UTF_8);

        Dotenv dotenv = Dotenv.configure().directory(directory.toString()).load();

        assertThat(dotenv.get("UNQUOTED")).isEqualTo(HASH);
        assertThat(dotenv.get("DOUBLE_QUOTED")).isEqualTo(HASH);
        // Single quotes are for the root .env read by Docker Compose; spring-dotenv keeps them.
        assertThat(dotenv.get("SINGLE_QUOTED")).isEqualTo("'" + HASH + "'");
    }

    /**
     * Joins the messages of a failure and all its causes.
     *
     * @param failure startup failure
     * @return every message, one per line
     */
    private static String failureMessages(Throwable failure) {
        StringBuilder messages = new StringBuilder();
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            messages.append(cause.getMessage()).append('\n');
        }
        return messages.toString();
    }

    /**
     * Minimal configuration binding the application settings.
     */
    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(ApplicationProperties.class)
    static class SettingsOnly {
    }
}
