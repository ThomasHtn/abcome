package io.github.thomashtn.littlewords.word;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.thomashtn.littlewords.support.NotebookApiTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies sentences, notebook entries of the sentence kind: same stages and sounds as a word, longer
 * texts, never unique.
 */
class SentenceApiTest extends NotebookApiTest {

    @Test
    @DisplayName("Adds a sentence labelled by its meaning, filed as custom, and lists it with the words")
    void createsSentence() throws Exception {
        postEntry(sentenceJson("Il n'y a plus de gâteau", "a pu ato"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.kind").value("sentence"))
            .andExpect(jsonPath("$.label").value("Il n'y a plus de gâteau"))
            .andExpect(jsonPath("$.category").value("custom"))
            .andExpect(jsonPath("$.pronunciations[0].spoken").value("a pu ato"));
        createWord("lapin", "apin", "almost", "2026-10-12");

        mockMvc().perform(get("/api/words").cookie(session()))
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].kind").value("sentence"))
            .andExpect(jsonPath("$[1].kind").value("word"));
    }

    @Test
    @DisplayName("Takes 200 characters for a sentence's meaning and spoken form, refuses 201")
    void checksSentenceLengths() throws Exception {
        postEntry(sentenceJson("a".repeat(200), "b".repeat(200)))
            .andExpect(status().isCreated());
        postEntry(sentenceJson("a".repeat(201), "pin"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        postEntry(sentenceJson("encore", "b".repeat(201)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Lets two sentences mean the same, and a word share a sentence's label")
    void neverRefusesASentenceAsDuplicate() throws Exception {
        postEntry(sentenceJson("encore", "ankor")).andExpect(status().isCreated());
        postEntry(sentenceJson("Encore", "akor")).andExpect(status().isCreated());
        createWord("encore", "ankor", "almost", "2026-10-12");
    }

    @Test
    @DisplayName("Renames a sentence to a long meaning, and takes long stages, which a word refuses")
    void renamesSentenceAndAddsLongStage() throws Exception {
        long sentenceId = idOf(postEntry(sentenceJson("encore", "ankor")));
        long wordId = createWord("chat", "ka", "learning", "2026-09-25");
        String meaning = "Je voudrais encore du gâteau au chocolat s'il te plaît maman";

        mockMvc().perform(put("/api/words/" + sentenceId).cookie(session()).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"label\": \"" + meaning + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.label").value(meaning))
            .andExpect(jsonPath("$.kind").value("sentence"));
        addStage(sentenceId, "c".repeat(150)).andExpect(status().isCreated());
        addStage(wordId, "c".repeat(61))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("Refuses an unknown kind with 400 INVALID_REQUEST")
    void refusesUnknownKind() throws Exception {
        postEntry("""
            {"kind": "poem", "label": "encore", "pronunciation": {"spoken": "ankor", "status": "learning",
             "date": "2026-10-12"}}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    /**
     * Builds the JSON of a new sentence, said "En route" on 12 October.
     *
     * @param meaning what the child meant
     * @param spoken  what he said
     * @return request body
     */
    private static String sentenceJson(String meaning, String spoken) {
        return """
            {"kind": "sentence", "label": "%s",
             "pronunciation": {"spoken": "%s", "status": "learning", "date": "2026-10-12"}}
            """.formatted(meaning, spoken);
    }

    /**
     * Creates a word or a sentence.
     *
     * @param json request body
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions postEntry(String json) throws Exception {
        return mockMvc().perform(post("/api/words").cookie(session()).with(xsrf())
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    /**
     * Adds an "En route" stage to an entry.
     *
     * @param id     entry identifier
     * @param spoken what the child said
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions addStage(long id, String spoken) throws Exception {
        return mockMvc().perform(post("/api/words/" + id + "/pronunciations").cookie(session()).with(xsrf())
            .contentType(MediaType.APPLICATION_JSON).content(stageJson(spoken, "learning", "2026-10-13")));
    }

    /**
     * Reads the id of a created entry.
     *
     * @param result creation result
     * @return entry identifier
     * @throws Exception when the body cannot be read
     */
    private static long idOf(ResultActions result) throws Exception {
        return JsonPath.<Number>read(result.andReturn().getResponse().getContentAsString(), "$.id").longValue();
    }
}
