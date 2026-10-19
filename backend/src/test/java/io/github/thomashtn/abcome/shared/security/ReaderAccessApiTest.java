package io.github.thomashtn.abcome.shared.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.thomashtn.abcome.support.NotebookApiTest;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Specifies the read-only session: a reader sees the whole notebook and changes nothing.
 */
class ReaderAccessApiTest extends NotebookApiTest {

    /**
     * Fake audio bytes of the word's sound.
     */
    private static final byte[] SOUND = "fake webm bytes".getBytes(StandardCharsets.UTF_8);

    /**
     * Word added by the family before the reader looks.
     */
    private long wordId;

    /**
     * Its only stage.
     */
    private long stageId;

    /**
     * Its only sound.
     */
    private long recordingId;

    /**
     * Session of the reader.
     */
    private Cookie reader;

    /**
     * Fills the notebook as the family, then signs the reader in.
     *
     * @throws Exception when a request fails
     */
    @BeforeEach
    void fillNotebookThenSignInReader() throws Exception {
        wordId = createWord("lapin", "apin", "almost", "2026-10-12");
        stageId = firstStageId(mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andReturn().getResponse().getContentAsString());
        String recording = mockMvc().perform(post("/api/pronunciations/" + stageId + "/recordings")
                .param("durationMs", "1200")
                .cookie(session())
                .with(xsrf())
                .contentType("audio/webm")
                .content(SOUND))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        recordingId = JsonPath.<Number>read(recording, "$.id").longValue();
        reader = signInAsReader();
    }

    @Test
    @DisplayName("Lets a reader read the list, a word, the dictionary and a sound")
    void readsNotebook() throws Exception {
        mockMvc().perform(get("/api/words").cookie(reader))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].label").value("lapin"));
        mockMvc().perform(get("/api/words/" + wordId).cookie(reader))
            .andExpect(status().isOk());
        mockMvc().perform(get("/api/dictionary").cookie(reader))
            .andExpect(status().isOk());
        mockMvc().perform(get("/api/recordings/" + recordingId).cookie(reader))
            .andExpect(status().isOk())
            .andExpect(content().bytes(SOUND));
    }

    @Test
    @DisplayName("Refuses every write of a reader with 403 FORBIDDEN and leaves the notebook as it was")
    void refusesWrites() throws Exception {
        List<MockHttpServletRequestBuilder> writes = List.of(
            post("/api/words").contentType(MediaType.APPLICATION_JSON)
                .content(wordJson("chat", "ka", "learning", "2026-10-12")),
            put("/api/words/" + wordId).contentType(MediaType.APPLICATION_JSON).content("{\"label\": \"lapinou\"}"),
            delete("/api/words/" + wordId),
            post("/api/words/" + wordId + "/pronunciations").contentType(MediaType.APPLICATION_JSON)
                .content(stageJson("lapin", "mastered", "2026-10-13")),
            put("/api/pronunciations/" + stageId).contentType(MediaType.APPLICATION_JSON)
                .content(stageJson("lapin", "mastered", "2026-10-12")),
            delete("/api/pronunciations/" + stageId),
            post("/api/pronunciations/" + stageId + "/recordings").param("durationMs", "1200")
                .contentType("audio/webm").content(SOUND),
            put("/api/recordings/" + recordingId).contentType(MediaType.APPLICATION_JSON)
                .content("{\"pronunciationId\": " + stageId + "}"),
            delete("/api/recordings/" + recordingId)
        );

        for (MockHttpServletRequestBuilder write : writes) {
            mockMvc().perform(write.cookie(reader).with(xsrf()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }

        mockMvc().perform(get("/api/words").cookie(reader))
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].label").value("lapin"))
            .andExpect(jsonPath("$[0].pronunciations.length()").value(1))
            .andExpect(jsonPath("$[0].pronunciations[0].spoken").value("apin"))
            .andExpect(jsonPath("$[0].recordings.length()").value(1));
    }

    @Test
    @DisplayName("Lets a reader sign out")
    void signsOut() throws Exception {
        mockMvc().perform(post("/api/auth/logout").cookie(reader).with(xsrf()))
            .andExpect(status().isNoContent());

        mockMvc().perform(get("/api/words").cookie(reader))
            .andExpect(status().isUnauthorized());
    }
}
