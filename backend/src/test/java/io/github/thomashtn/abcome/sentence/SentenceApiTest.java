package io.github.thomashtn.abcome.sentence;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.thomashtn.abcome.support.NotebookApiTest;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies the sentences API: list, add, rewrite, delete.
 */
class SentenceApiTest extends NotebookApiTest {

    @Test
    @DisplayName("Adds a sentence with its meaning, and lists sentences newest first")
    void createsAndListsSentences() throws Exception {
        postSentence(sentenceJson("a pu ato", "Il n'y a plus de gâteau", "2026-10-14"))
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", startsWith("/api/sentences/")))
            .andExpect(jsonPath("$.spoken").value("a pu ato"))
            .andExpect(jsonPath("$.meaning").value("Il n'y a plus de gâteau"));
        postSentence(sentenceJson("papa pati", "", "2026-10-09"))
            .andExpect(jsonPath("$.meaning").isEmpty());
        postSentence("{\"spoken\": \"encore lolo\", \"date\": \"2026-10-15\"}")
            .andExpect(status().isCreated());

        mockMvc().perform(get("/api/sentences").cookie(session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(3))
            .andExpect(jsonPath("$[0].spoken").value("encore lolo"))
            .andExpect(jsonPath("$[1].spoken").value("a pu ato"))
            .andExpect(jsonPath("$[2].spoken").value("papa pati"));
    }

    @Test
    @DisplayName("Refuses a blank sentence or a future date with 400 INVALID_REQUEST")
    void refusesInvalidSentence() throws Exception {
        postSentence(sentenceJson(" ", "", "2026-10-14"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
            .andExpect(jsonPath("$.errors.spoken").exists());
        postSentence(sentenceJson("a pu ato", "", LocalDate.now().plusDays(2).toString()))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Checks lengths after trimming: 200 characters in spaces are stored trimmed, 201 are refused")
    void checksLengthsAfterTrimming() throws Exception {
        String spoken = "a".repeat(200);
        String meaning = "b".repeat(200);
        postSentence(sentenceJson("  " + spoken + "  ", "  " + meaning + "  ", "2026-10-14"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.spoken").value(spoken))
            .andExpect(jsonPath("$.meaning").value(meaning));

        postSentence(sentenceJson("a pu ato", "c".repeat(201), "2026-10-14"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.meaning").exists());
    }

    @Test
    @DisplayName("Rewrites a sentence, or answers 404 and 400")
    void updatesSentence() throws Exception {
        long id = createSentence();

        putSentence(id, sentenceJson("a pu gato", "Il n'y a plus de gâteau", "2026-10-13"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.spoken").value("a pu gato"))
            .andExpect(jsonPath("$.date").value("2026-10-13"));
        putSentence(999_999, sentenceJson("a pu gato", "", "2026-10-13"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        putSentence(id, sentenceJson("a pu gato", "", LocalDate.now().plusDays(2).toString()))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Deletes a sentence, then answers 404 for it")
    void deletesSentence() throws Exception {
        long id = createSentence();

        mockMvc().perform(delete("/api/sentences/" + id).cookie(session()).with(xsrf()))
            .andExpect(status().isNoContent());
        mockMvc().perform(delete("/api/sentences/" + id).cookie(session()).with(xsrf()))
            .andExpect(status().isNotFound());
    }

    /**
     * Adds a sentence through the API.
     *
     * @return its identifier
     * @throws Exception when the request fails
     */
    private long createSentence() throws Exception {
        String body = postSentence(sentenceJson("a pu ato", "", "2026-10-14"))
            .andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(body, "$.id").longValue();
    }

    /**
     * Posts a sentence.
     *
     * @param json request body
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions postSentence(String json) throws Exception {
        return mockMvc().perform(post("/api/sentences").cookie(session()).with(xsrf())
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    /**
     * Puts new values on a sentence.
     *
     * @param id   sentence identifier
     * @param json request body
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions putSentence(long id, String json) throws Exception {
        return mockMvc().perform(put("/api/sentences/" + id).cookie(session()).with(xsrf())
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    /**
     * Builds the JSON of a sentence.
     *
     * @param spoken  what Côme said
     * @param meaning what he meant
     * @param date    day he said it
     * @return request body
     */
    private static String sentenceJson(String spoken, String meaning, String date) {
        return """
            {"spoken": "%s", "meaning": "%s", "date": "%s"}
            """.formatted(spoken, meaning, date);
    }
}
