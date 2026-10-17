package io.github.thomashtn.abcome.shared.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures application-wide time-related dependencies.
 */
@Configuration
public class TimeConfig {

    /**
     * Provides the system UTC clock used by services, replaced by a fixed clock in tests.
     *
     * @return application clock
     */
    @Bean
    Clock applicationClock() {
        return Clock.systemUTC();
    }
}
