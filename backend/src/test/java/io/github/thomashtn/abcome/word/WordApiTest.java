package io.github.thomashtn.abcome.word;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.abcome.support.NotebookApiTest;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies the words API: list, read, add, rename, delete.
 */
class WordApiTest extends NotebookApiTest {

    @Test
    @DisplayName("Adds a word with its first stage, its dictionary category and its location")
    void createsWord() throws Exception {
        postWord(wordJson("  Lapin ", " pin ", "learning", "2026-09-16"))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", startsWith("/api/words/")))
            .andExpect(jsonPath("$.label").value("Lapin"))
            .andExpect(jsonPath("$.category").value("animals"))
            .andExpect(jsonPath("$.createdAt").isNotEmpty())
            .andExpect(jsonPath("$.pronunciations.length()").value(1))
            .andExpect(jsonPath("$.pronunciations[0].spoken").value("pin"))
            .andExpect(jsonPath("$.pronunciations[0].status").value("learning"))
            .andExpect(jsonPath("$.pronunciations[0].date").value("2026-09-16"))
            .andExpect(jsonPath("$.pronunciations[0].createdAt").isNotEmpty())
            .andExpect(jsonPath("$.pronunciations[0].recordingId").doesNotExist())
            .andExpect(jsonPath("$.recordings.length()").value(0));
    }

    @Test
    @DisplayName("Files a word the dictionary does not know as custom")
    void createsCustomWord() throws Exception {
        postWord(wordJson("tracto-pelle", "tato", "learning", "2026-09-16"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.category").value("custom"));
    }

    @Test
    @DisplayName("Refuses the same word again, whatever its case or accents, with 409 WORD_ALREADY_EXISTS")
    void refusesDuplicate() throws Exception {
        createWord("bébé", "bebe", "almost", "2026-09-01");

        postWord(wordJson("BEBE", "baba", "learning", "2026-09-02"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("WORD_ALREADY_EXISTS"));
    }

    @Test
    @DisplayName("Refuses a blank label, an unknown status or a missing stage with 400 INVALID_REQUEST")
    void refusesInvalidWord() throws Exception {
        postWord(wordJson(" ", "pin", "learning", "2026-09-16"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
            .andExpect(jsonPath("$.errors.label").exists());
        postWord(wordJson("lapin", "pin", "perfect", "2026-09-16"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        postWord("{\"label\": \"lapin\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.pronunciation").exists());
    }

    @Test
    @DisplayName("Refuses a label made only of accents, invisible once normalized, at creation and rename")
    void refusesInvisibleLabel() throws Exception {
        postWord(wordJson("́́", "pin", "learning", "2026-09-16"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
            .andExpect(jsonPath("$.errors.label").exists());

        long id = createWord("lapin", "pin", "learning", "2026-09-16");
        putWord(id, "{\"label\": \"́\"}")
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.label").exists());
    }

    @Test
    @DisplayName("Checks lengths after trimming: a 40-letter label and 60-letter spoken form are stored trimmed")
    void checksLengthsAfterTrimming() throws Exception {
        String label = "a".repeat(40);
        String spoken = "b".repeat(60);
        postWord(wordJson("  " + label + "  ", "  " + spoken + "  ", "learning", "2026-09-16"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.kind").value("word"))
            .andExpect(jsonPath("$.label").value(label))
            .andExpect(jsonPath("$.pronunciations[0].spoken").value(spoken));

        postWord(wordJson("  " + "c".repeat(41) + "  ", "pin", "learning", "2026-09-16"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        postWord(wordJson("chat", "d".repeat(61), "learning", "2026-09-16"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("Refuses a first stage dated in the future with 400 INVALID_REQUEST")
    void refusesFutureDate() throws Exception {
        postWord(wordJson("lapin", "pin", "learning", LocalDate.now().plusDays(2).toString()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("Refuses a first stage dated before 2020, a mistyped year, with 400 INVALID_REQUEST")
    void refusesMistypedYear() throws Exception {
        postWord(wordJson("lapin", "pin", "learning", "0202-10-12"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        postWord(wordJson("lapin", "pin", "learning", "2020-01-01"))
            .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Lists every word with all its stages, oldest stage first")
    void listsWords() throws Exception {
        long lapin = createWord("lapin", "pin", "learning", "2026-09-16");
        createWord("maman", "mama", "almost", "2026-08-30");
        mockMvc().perform(post("/api/words/" + lapin + "/pronunciations").cookie(session()).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content(stageJson("apin", "almost", "2026-09-10")))
            .andExpect(status().isCreated());

        mockMvc().perform(get("/api/words").cookie(session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].label").value("lapin"))
            .andExpect(jsonPath("$[0].pronunciations.length()").value(2))
            .andExpect(jsonPath("$[0].pronunciations[0].spoken").value("apin"))
            .andExpect(jsonPath("$[0].pronunciations[1].spoken").value("pin"))
            .andExpect(jsonPath("$[1].label").value("maman"))
            .andExpect(jsonPath("$[1].pronunciations.length()").value(1));
    }

    @Test
    @DisplayName("Reads one word, or answers 404 NOT_FOUND")
    void readsWord() throws Exception {
        long id = createWord("chien", "sien", "almost", "2026-09-20");

        mockMvc().perform(get("/api/words/" + id).cookie(session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.pronunciations[0].wordId").value(id));
        mockMvc().perform(get("/api/words/999999").cookie(session()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Renames a word, updating its category, and keeps its stages")
    void renamesWord() throws Exception {
        long id = createWord("lapain", "pin", "learning", "2026-09-16");

        putWord(id, "{\"label\": \"lapin\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.label").value("lapin"))
            .andExpect(jsonPath("$.category").value("animals"))
            .andExpect(jsonPath("$.pronunciations.length()").value(1));
        putWord(id, "{\"label\": \"Lapin\"}")
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Refuses a rename onto another word, a blank label or an unknown word")
    void refusesInvalidRename() throws Exception {
        long id = createWord("lapin", "pin", "learning", "2026-09-16");
        createWord("chat", "ka", "learning", "2026-09-25");

        putWord(id, "{\"label\": \"Chat\"}")
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("WORD_ALREADY_EXISTS"));
        putWord(id, "{\"label\": \"\"}")
            .andExpect(status().isBadRequest());
        putWord(999_999, "{\"label\": \"loup\"}")
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Deletes a word with its stages, then answers 404 for it")
    void deletesWord() throws Exception {
        long id = createWord("lapin", "pin", "learning", "2026-09-16");

        mockMvc().perform(delete("/api/words/" + id).cookie(session()).with(xsrf()))
            .andExpect(status().isNoContent());
        mockMvc().perform(delete("/api/words/" + id).cookie(session()).with(xsrf()))
            .andExpect(status().isNotFound());
        mockMvc().perform(get("/api/words").cookie(session()))
            .andExpect(jsonPath("$.length()").value(0));
    }

    /**
     * Posts a new word.
     *
     * @param json request body
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions postWord(String json) throws Exception {
        return mockMvc().perform(post("/api/words").cookie(session()).with(xsrf())
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    /**
     * Puts a new label on a word.
     *
     * @param id   word identifier
     * @param json request body
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions putWord(long id, String json) throws Exception {
        return mockMvc().perform(put("/api/words/" + id).cookie(session()).with(xsrf())
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }
}
