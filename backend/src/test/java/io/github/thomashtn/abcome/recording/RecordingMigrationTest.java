package io.github.thomashtn.abcome.recording;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.thomashtn.abcome.support.PostgreSqlIntegrationTest;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Checks that V4 moves the sounds recorded under V1 to the word of their stage, and that V5 files them
 * under the stage current on their recording day.
 *
 * <p>The migrations run in a scratch schema of the shared database, so the application schema stays
 * untouched.</p>
 */
class RecordingMigrationTest extends PostgreSqlIntegrationTest {

    /**
     * Scratch schema migrated step by step, dropped after the test.
     */
    private static final String SCHEMA = "migration_check";

    /**
     * Datasource of the shared test database.
     */
    @Autowired
    private DataSource dataSource;

    /**
     * Direct database access, to seed and read the scratch schema.
     */
    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Drops the scratch schema.
     */
    @AfterEach
    void dropSchema() {
        jdbcTemplate.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
    }

    @Test
    @DisplayName("Moves an existing stage sound to its word, keeps it when the stage goes, deletes it with the word")
    void movesStageSoundToWord() {
        flyway("3").migrate();
        jdbcTemplate.update("INSERT INTO " + SCHEMA + ".word (id, label, normalized_label, category, created_at) "
            + "VALUES (1, 'lapin', 'lapin', 'animals', now())");
        jdbcTemplate.update("INSERT INTO " + SCHEMA + ".pronunciation (id, word_id, spoken, status, date, created_at) "
            + "VALUES (10, 1, 'pin', 'learning', '2026-09-16', now()), (11, 1, 'apin', 'almost', '2026-10-12', now())");
        jdbcTemplate.update("INSERT INTO " + SCHEMA + ".recording "
            + "(id, pronunciation_id, data, mime_type, size_bytes, duration_ms, created_at) "
            + "VALUES (5, 11, '\\x01'::bytea, 'audio/webm', 1, 900, now())");

        flyway("4").migrate();

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            "SELECT id, word_id FROM " + SCHEMA + ".recording");
        assertThat(rows).singleElement().satisfies(row -> {
            assertThat(((Number) row.get("id")).longValue()).isEqualTo(5L);
            assertThat(((Number) row.get("word_id")).longValue()).isEqualTo(1L);
        });
        jdbcTemplate.update("DELETE FROM " + SCHEMA + ".pronunciation WHERE id = 11");
        assertThat(count()).isEqualTo(1);
        jdbcTemplate.update("DELETE FROM " + SCHEMA + ".word WHERE id = 1");
        assertThat(count()).isZero();
    }

    @Test
    @DisplayName("Files each sound under the stage current on its Paris day, the oldest stage before any, and "
        + "deletes them with the word")
    void filesSoundsUnderStageOfTheirDay() {
        flyway("4").migrate();
        jdbcTemplate.update("INSERT INTO " + SCHEMA + ".word (id, label, normalized_label, category, created_at) "
            + "VALUES (1, 'lapin', 'lapin', 'animals', now())");
        jdbcTemplate.update("INSERT INTO " + SCHEMA + ".pronunciation (id, word_id, spoken, status, date, created_at) "
            + "VALUES (10, 1, 'pin', 'learning', '2026-09-16', now()), (11, 1, 'apin', 'almost', '2026-10-12', now())");
        jdbcTemplate.update("INSERT INTO " + SCHEMA + ".recording "
            + "(id, word_id, data, mime_type, size_bytes, duration_ms, created_at) VALUES "
            + "(5, 1, '\\x01'::bytea, 'audio/webm', 1, 900, '2026-10-01T10:00:00+02:00'), "
            + "(6, 1, '\\x01'::bytea, 'audio/webm', 1, 900, '2026-10-11T22:30:00Z'), "
            + "(7, 1, '\\x01'::bytea, 'audio/webm', 1, 900, '2026-09-01T10:00:00+02:00')");

        flyway("latest").migrate();

        assertThat(jdbcTemplate.queryForList(
            "SELECT pronunciation_id FROM " + SCHEMA + ".recording ORDER BY id", Long.class))
            .containsExactly(10L, 11L, 10L);
        jdbcTemplate.update("DELETE FROM " + SCHEMA + ".word WHERE id = 1");
        assertThat(count()).isZero();
    }

    /**
     * Configures Flyway on the scratch schema up to a version.
     *
     * @param target target version, or {@code latest}
     * @return Flyway instance
     */
    private Flyway flyway(String target) {
        return Flyway.configure()
            .dataSource(dataSource)
            .schemas(SCHEMA)
            .target(target)
            .load();
    }

    /**
     * Counts the sounds of the scratch schema.
     *
     * @return number of recordings
     */
    private int count() {
        Integer count = jdbcTemplate.queryForObject("SELECT count(*) FROM " + SCHEMA + ".recording", Integer.class);
        return count == null ? 0 : count;
    }
}
