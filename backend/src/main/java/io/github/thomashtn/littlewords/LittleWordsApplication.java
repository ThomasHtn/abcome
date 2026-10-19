package io.github.thomashtn.littlewords;

import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/**
 * Entry point of the Little Words backend.
 */
@SpringBootApplication
@EnableConfigurationProperties(ApplicationProperties.class)
public class LittleWordsApplication {

    /**
     * Starts the Spring Boot application.
     *
     * @param args command-line arguments passed to Spring Boot
     */
    public static void main(String[] args) {
        SpringApplication.run(LittleWordsApplication.class, args);
    }
}
