package io.github.thomashtn.littlewords.shared.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures application-wide time-related dependencies.
 */
@Configuration
public class TimeConfig {

    /**
     * Provides the system clock in the family's zone, so {@code LocalDate.now(clock)} is their today.
     *
     * @param properties application settings holding the zone
     * @return application clock, replaced by a fixed clock in tests
     */
    @Bean
    Clock applicationClock(ApplicationProperties properties) {
        return Clock.system(properties.timeZone());
    }
}
