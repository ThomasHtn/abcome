package io.github.thomashtn.abcome.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Application settings under {@code app.*}, validated at startup so a bad value stops the boot.
 *
 * @param apiDocsEnabled whether the OpenAPI document and Swagger UI are served and reachable
 */
@Validated
@ConfigurationProperties("app")
public record ApplicationProperties(boolean apiDocsEnabled) {
}
