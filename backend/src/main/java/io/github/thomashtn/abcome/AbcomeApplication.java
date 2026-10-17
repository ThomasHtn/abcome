package io.github.thomashtn.abcome;

import io.github.thomashtn.abcome.shared.config.ApplicationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/**
 * Entry point of the ABCome backend.
 */
@SpringBootApplication
@EnableConfigurationProperties(ApplicationProperties.class)
public class AbcomeApplication {

    /**
     * Starts the Spring Boot application.
     *
     * @param args command-line arguments passed to Spring Boot
     */
    public static void main(String[] args) {
        SpringApplication.run(AbcomeApplication.class, args);
    }
}
