package io.github.thomashtn.littlewords.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

/**
 * Specifies how {@code APP_NAME} and {@code APP_NAME_ACCENT} are checked at startup.
 */
class BrandingSettingsTest {

    /**
     * Context binding only the application settings, with the other keys valid.
     */
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withUserConfiguration(SettingsOnly.class)
        .withPropertyValues(
            "app.child-name=Alix",
            "app.time-zone=Europe/Paris",
            "app.auth.password-hash=$argon2id$v=19$m=32768,t=3,p=1$c2FsdA$aGFzaA",
            "app.auth.max-failures=5",
            "app.auth.initial-lockout=PT1M",
            "app.auth.max-lockout=PT15M",
            "app.auth.max-concurrent-checks=2",
            "app.recording.max-bytes=2097152",
            "app.recording.min-duration-ms=300",
            "app.recording.max-duration-ms=30000"
        );

    @Test
    @DisplayName("Starts with a family's own name, its accent ending it or left empty")
    void acceptsNameAndAccent() {
        runner.withPropertyValues("app.branding.name=ABLéa", "app.branding.name-accent=Léa").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getBean(ApplicationProperties.class).branding())
                .isEqualTo(new ApplicationProperties.Branding("ABLéa", "Léa"));
        });
        runner.withPropertyValues("app.branding.name=Petits mots", "app.branding.name-accent=")
            .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    @DisplayName("Refuses to start without a name, or with an accent that does not end it, naming the variable")
    void refusesInvalidName() {
        runner.withPropertyValues("app.branding.name=").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasStackTraceContaining("APP_NAME must be set");
        });
        runner.withPropertyValues("app.branding.name=ABLéa", "app.branding.name-accent=ome").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasStackTraceContaining("APP_NAME_ACCENT must be the end");
        });
    }

    /**
     * Minimal configuration binding the application settings.
     */
    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(ApplicationProperties.class)
    static class SettingsOnly {
    }
}
