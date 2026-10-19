package io.github.thomashtn.abcome.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.MediaType;

/**
 * Base class of the notebook API tests: an empty notebook and a signed-in family member.
 */
public abstract class NotebookApiTest extends PostgreSqlIntegrationTest {

    /**
     * Session cookie of the signed-in family member.
     */
    private Cookie session;

    /**
     * Empties the notebook and signs in before each test.
     *
     * @throws Exception when signing in fails
     */
    @BeforeEach
    void signInOnEmptyNotebook() throws Exception {
        clearNotebook();
        session = signIn();
    }

    /**
     * Returns the session cookie of the signed-in family member.
     *
     * @return session cookie
     */
    protected Cookie session() {
        return session;
    }

    /**
     * Adds a word with one stage through the API.
     *
     * @param label  the word
     * @param spoken what the child said
     * @param status stage status code
     * @param date   stage date
     * @return created word identifier
     * @throws Exception when the request fails
     */
    protected long createWord(String label, String spoken, String status, String date) throws Exception {
        String body = mockMvc().perform(post("/api/words")
                .cookie(session)
                .with(xsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(wordJson(label, spoken, status, date)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(body, "$.id").longValue();
    }

    /**
     * Reads the id of the first stage of a word response.
     *
     * @param wordJson word response body
     * @return stage identifier
     */
    protected static long firstStageId(String wordJson) {
        return JsonPath.<Number>read(wordJson, "$.pronunciations[0].id").longValue();
    }

    /**
     * Builds the JSON of a new word.
     *
     * @param label  the word
     * @param spoken what the child said
     * @param status stage status code
     * @param date   stage date
     * @return request body
     */
    protected static String wordJson(String label, String spoken, String status, String date) {
        return """
            {"label": "%s", "pronunciation": {"spoken": "%s", "status": "%s", "date": "%s"}}
            """.formatted(label, spoken, status, date);
    }

    /**
     * Builds the JSON of a stage.
     *
     * @param spoken what the child said
     * @param status stage status code
     * @param date   stage date
     * @return request body
     */
    protected static String stageJson(String spoken, String status, String date) {
        return """
            {"spoken": "%s", "status": "%s", "date": "%s"}
            """.formatted(spoken, status, date);
    }
}
