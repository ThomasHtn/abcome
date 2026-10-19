package io.github.thomashtn.littlewords.word;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.thomashtn.littlewords.support.NotebookApiTest;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies the stages API: add under a word, rewrite, delete.
 */
class PronunciationApiTest extends NotebookApiTest {

    @Test
    @DisplayName("Adds a stage to a word, with its location")
    void addsStage() throws Exception {
        long wordId = createWord("lapin", "pin", "learning", "2026-09-16");

        addStage(wordId, stageJson(" apin ", "almost", "2026-10-12"))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.wordId").value(wordId))
            .andExpect(jsonPath("$.spoken").value("apin"))
            .andExpect(jsonPath("$.status").value("almost"))
            .andExpect(jsonPath("$.createdAt").isNotEmpty())
            .andExpect(jsonPath("$.recordingId").doesNotExist());
    }

    @Test
    @DisplayName("Refuses a stage for an unknown word, an invalid stage or a future date")
    void refusesInvalidStage() throws Exception {
        long wordId = createWord("lapin", "pin", "learning", "2026-09-16");

        addStage(999_999, stageJson("apin", "almost", "2026-10-12"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        addStage(wordId, stageJson("", "almost", "2026-10-12"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.spoken").exists());
        addStage(wordId, stageJson("apin", "almost", LocalDate.now().plusDays(2).toString()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("Rewrites a stage, or answers 404 and 400")
    void updatesStage() throws Exception {
        long stageId = firstStageOf(createWord("lapin", "pin", "learning", "2026-09-16"));

        putStage(stageId, stageJson("lapin", "mastered", "2026-10-15"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(stageId))
            .andExpect(jsonPath("$.spoken").value("lapin"))
            .andExpect(jsonPath("$.status").value("mastered"))
            .andExpect(jsonPath("$.date").value("2026-10-15"));
        putStage(999_999, stageJson("lapin", "mastered", "2026-10-15"))
            .andExpect(status().isNotFound());
        putStage(stageId, stageJson("lapin", "mastered", LocalDate.now().plusDays(2).toString()))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Deletes a stage, but refuses the last one of a word with 409 LAST_PRONUNCIATION")
    void deletesStage() throws Exception {
        long wordId = createWord("lapin", "pin", "learning", "2026-09-16");
        long first = firstStageOf(wordId);
        String added = addStage(wordId, stageJson("apin", "almost", "2026-10-12"))
            .andReturn().getResponse().getContentAsString();
        long second = JsonPath.<Number>read(added, "$.id").longValue();

        mockMvc().perform(delete("/api/pronunciations/" + second).cookie(session()).with(xsrf()))
            .andExpect(status().isNoContent());
        mockMvc().perform(delete("/api/pronunciations/" + first).cookie(session()).with(xsrf()))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("LAST_PRONUNCIATION"));
        mockMvc().perform(delete("/api/pronunciations/" + second).cookie(session()).with(xsrf()))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Deletes only one of the last two stages when both are deleted at once: the word keeps a stage")
    void keepsOneStageUnderParallelDeletes() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < 5; round++) {
                long wordId = createWord("mot" + round, "pin", "learning", "2026-09-16");
                long first = firstStageOf(wordId);
                long second = JsonPath.<Number>read(addStage(wordId, stageJson("apin", "almost", "2026-10-12"))
                    .andReturn().getResponse().getContentAsString(), "$.id").longValue();
                CyclicBarrier start = new CyclicBarrier(2);

                List<Future<Integer>> results = executor.invokeAll(List.of(
                    deleteTogether(first, start), deleteTogether(second, start)
                ));

                assertThat(List.of(results.get(0).get(), results.get(1).get())).containsExactlyInAnyOrder(204, 409);
                mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
                    .andExpect(jsonPath("$.pronunciations.length()").value(1));
            }
        } finally {
            executor.shutdownNow();
        }
    }

    /**
     * Builds a stage deletion that waits for its twin, so both reach the server together.
     *
     * @param stageId stage identifier
     * @param start   barrier shared by the twin deletions
     * @return the deletion, answering its HTTP status
     */
    private Callable<Integer> deleteTogether(long stageId, CyclicBarrier start) {
        return () -> {
            start.await(10, TimeUnit.SECONDS);
            return mockMvc().perform(delete("/api/pronunciations/" + stageId).cookie(session()).with(xsrf()))
                .andReturn().getResponse().getStatus();
        };
    }

    /**
     * Reads the id of the first stage of a word.
     *
     * @param wordId word identifier
     * @return stage identifier
     * @throws Exception when the request fails
     */
    private long firstStageOf(long wordId) throws Exception {
        return firstStageId(mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andReturn().getResponse().getContentAsString());
    }

    /**
     * Posts a stage under a word.
     *
     * @param wordId word identifier
     * @param json   request body
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions addStage(long wordId, String json) throws Exception {
        return mockMvc().perform(post("/api/words/" + wordId + "/pronunciations").cookie(session()).with(xsrf())
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    /**
     * Puts new values on a stage.
     *
     * @param stageId stage identifier
     * @param json    request body
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions putStage(long stageId, String json) throws Exception {
        return mockMvc().perform(put("/api/pronunciations/" + stageId).cookie(session()).with(xsrf())
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }
}
