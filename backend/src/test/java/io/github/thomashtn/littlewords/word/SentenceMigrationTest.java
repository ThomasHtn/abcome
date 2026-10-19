package io.github.thomashtn.littlewords.word;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.thomashtn.littlewords.support.PostgreSqlIntegrationTest;
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
 * Checks that V6 turns each sentence into a sentence entry with one "En route" stage, then drops the
 * sentence table.
 *
 * <p>The migrations run in a scratch schema of the shared database, so the application schema stays
 * untouched.</p>
 */
class SentenceMigrationTest extends PostgreSqlIntegrationTest {

    /**
     * Scratch schema migrated step by step, dropped after the test.
     */
    private static final String SCHEMA = "sentence_migration_check";

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
    @DisplayName("Labels each sentence by its meaning, else by what was said, keeps words, and drops the old table")
    void mergesSentencesIntoWords() {
        Flyway.configure().dataSource(dataSource).schemas(SCHEMA).target("5").load().migrate();
        jdbcTemplate.update("INSERT INTO " + SCHEMA + ".word (id, label, normalized_label, category, created_at) "
            + "VALUES (100, 'lapin', 'lapin', 'animals', now())");
        jdbcTemplate.update("INSERT INTO " + SCHEMA + ".sentence (id, spoken, meaning, date, created_at) VALUES "
            + "(1, 'a pu ato', 'Il n''y a plus de gâteau', '2026-10-14', now()), "
            + "(2, 'papa pati', NULL, '2026-10-09', now()), "
            + "(3, 'a pu ato', 'Il n''y a plus de gâteau', '2026-10-15', now())");

        Flyway.configure().dataSource(dataSource).schemas(SCHEMA).load().migrate();

        List<Map<String, Object>> entries = jdbcTemplate.queryForList(
            "SELECT w.kind, w.label, w.category, p.spoken, p.status, p.date::text AS date FROM " + SCHEMA + ".word w "
                + "JOIN " + SCHEMA + ".pronunciation p ON p.word_id = w.id WHERE w.kind = 'sentence' ORDER BY p.date");
        assertThat(entries).extracting(row -> row.get("label"))
            .containsExactly("papa pati", "Il n'y a plus de gâteau", "Il n'y a plus de gâteau");
        assertThat(entries).extracting(row -> row.get("spoken"))
            .containsExactly("papa pati", "a pu ato", "a pu ato");
        assertThat(entries).allSatisfy(row -> {
            assertThat(row.get("category")).isEqualTo("custom");
            assertThat(row.get("status")).isEqualTo("learning");
        });
        assertThat(entries.get(0).get("date")).isEqualTo("2026-10-09");
        assertThat(jdbcTemplate.queryForObject(
            "SELECT kind FROM " + SCHEMA + ".word WHERE id = 100", String.class)).isEqualTo("word");
        assertThat(jdbcTemplate.queryForObject(
            "SELECT count(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = 'sentence'",
            Integer.class, SCHEMA)).isZero();
    }
}
