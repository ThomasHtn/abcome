package io.github.thomashtn.abcome.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Centralizes the OpenAPI metadata displayed by Swagger UI.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Builds the global OpenAPI document definition.
     *
     * @return OpenAPI metadata shown at the top of Swagger UI
     */
    @Bean
    public OpenAPI abcomeOpenApi() {
        return new OpenAPI().info(createApiInformation());
    }

    /**
     * Creates the human-readable project information shown at the top of Swagger UI.
     *
     * @return API title, version, description and project contact
     */
    private Info createApiInformation() {
        return new Info()
            .title("ABCome API")
            .version("1.0.0")
            .description("""
                REST API of the ABCome notebook: a toddler's first words and sentences, their
                pronunciation stages and audio recordings.
                """)
            .contact(new Contact().name("Thomas HTN"));
    }
}
