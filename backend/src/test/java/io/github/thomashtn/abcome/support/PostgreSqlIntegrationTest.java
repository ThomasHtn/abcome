package io.github.thomashtn.abcome.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base class for Spring tests, backed by one PostgreSQL 17 container shared by the whole suite.
 *
 * <p>Singleton container pattern: started once in a static initializer and reaped by Ryuk, so the
 * container outlives every test class instead of stopping after the first one. Tests run on the
 * production {@code application.properties}, Flyway included.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class PostgreSqlIntegrationTest {

    /**
     * PostgreSQL container shared by every test class.
     */
    private static final PostgreSQLContainer POSTGRESQL = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRESQL.start();
    }

    /**
     * Points the datasource at the shared container.
     *
     * @param registry Spring dynamic property registry
     */
    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRESQL::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRESQL::getUsername);
        registry.add("spring.datasource.password", POSTGRESQL::getPassword);
    }
}
