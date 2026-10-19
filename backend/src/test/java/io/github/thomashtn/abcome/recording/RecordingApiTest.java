package io.github.thomashtn.abcome.recording;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.thomashtn.abcome.support.NotebookApiTest;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Specifies the recordings API: raw upload under a stage of a word, playback and deletion by id.
 */
class RecordingApiTest extends NotebookApiTest {

    /**
     * Fake audio bytes: the API stores them as sent, without decoding.
     */
    private static final byte[] SOUND = "fake webm bytes".getBytes(StandardCharsets.UTF_8);

    /**
     * Word receiving the sounds.
     */
    private long wordId;

    /**
     * Its only stage at first, under which the sounds are filed.
     */
    private long stageId;

    /**
     * Adds the word whose stage receives the sounds.
     *
     * @throws Exception when the request fails
     */
    @BeforeEach
    void createWord() throws Exception {
        wordId = createWord("lapin", "apin", "almost", "2026-10-12");
        stageId = stageOf(wordId);
    }

    @Test
    @DisplayName("Adds a sound with codec parameters and serves it back with its type, cacheable forever")
    void addsAndServesSound() throws Exception {
        long recordingId = idOf(upload(stageId, "audio/webm;codecs=opus", 1200, SOUND)
            .andExpect(status().isCreated())
            .andExpect(header().string("Location", startsWith("/api/recordings/")))
            .andExpect(jsonPath("$.wordId").value(wordId))
            .andExpect(jsonPath("$.pronunciationId").value(stageId))
            .andExpect(jsonPath("$.mimeType").value("audio/webm"))
            .andExpect(jsonPath("$.durationMs").value(1200))
            .andExpect(jsonPath("$.createdAt").isNotEmpty()));

        mockMvc().perform(get("/api/recordings/" + recordingId).cookie(session()))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "audio/webm"))
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "private, max-age=31536000, immutable"))
            .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
            .andExpect(content().bytes(SOUND));
        mockMvc().perform(get("/api/words").cookie(session()))
            .andExpect(jsonPath("$[0].recordings.length()").value(1))
            .andExpect(jsonPath("$[0].recordings[0].id").value(recordingId))
            .andExpect(jsonPath("$[0].recordings[0].pronunciationId").value(stageId))
            .andExpect(jsonPath("$[0].recordings[0].data").doesNotExist());
    }

    @Test
    @DisplayName("Answers a byte-range request with 206 and only those bytes, as iOS Safari requires to play media")
    void servesByteRange() throws Exception {
        long recordingId = idOf(upload(stageId, "audio/mp4", 1200, SOUND));

        mockMvc().perform(get("/api/recordings/" + recordingId).cookie(session())
                .header(HttpHeaders.RANGE, "bytes=0-3"))
            .andExpect(status().isPartialContent())
            .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "audio/mp4"))
            .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 0-3/" + SOUND.length))
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "private, max-age=31536000, immutable"))
            .andExpect(content().bytes(Arrays.copyOf(SOUND, 4)));
    }

    @Test
    @DisplayName("Keeps every sound of a word, newest first, in the word and in the list")
    void keepsSeveralSoundsNewestFirst() throws Exception {
        long first = idOf(upload(stageId, "audio/webm", 900, SOUND));
        long second = idOf(upload(stageId, "audio/mp4", 1500, SOUND));
        long third = idOf(upload(stageId, "audio/webm", 2000, SOUND));

        mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andExpect(jsonPath("$.recordings.length()").value(3))
            .andExpect(jsonPath("$.recordings[0].id").value(third))
            .andExpect(jsonPath("$.recordings[1].id").value(second))
            .andExpect(jsonPath("$.recordings[2].id").value(first))
            .andExpect(jsonPath("$.recordings[1].mimeType").value("audio/mp4"));
        mockMvc().perform(get("/api/words").cookie(session()))
            .andExpect(jsonPath("$[0].recordings.length()").value(3))
            .andExpect(jsonPath("$[0].recordings[0].id").value(third));
    }

    @Test
    @DisplayName("Lists each word with its own sounds only")
    void listsSoundsPerWord() throws Exception {
        long otherStageId = stageOf(createWord("chat", "ka", "learning", "2026-09-25"));
        long lapinSound = idOf(upload(stageId, "audio/webm", 900, SOUND));
        long chatSound = idOf(upload(otherStageId, "audio/webm", 900, SOUND));

        mockMvc().perform(get("/api/words").cookie(session()))
            .andExpect(jsonPath("$[0].recordings.length()").value(1))
            .andExpect(jsonPath("$[0].recordings[0].id").value(lapinSound))
            .andExpect(jsonPath("$[1].recordings.length()").value(1))
            .andExpect(jsonPath("$[1].recordings[0].id").value(chatSound));
    }

    @Test
    @DisplayName("Stores parallel uploads for one word side by side: every one succeeds and all are kept")
    void storesParallelUploads() throws Exception {
        int uploads = 4;
        ExecutorService executor = Executors.newFixedThreadPool(uploads);
        try {
            List<Callable<Integer>> requests = new ArrayList<>();
            for (int index = 0; index < uploads; index++) {
                requests.add(() -> upload(stageId, "audio/webm", 1000, SOUND).andReturn().getResponse().getStatus());
            }
            for (Future<Integer> result : executor.invokeAll(requests)) {
                assertThat(result.get()).isEqualTo(201);
            }
        } finally {
            executor.shutdownNow();
        }

        mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andExpect(jsonPath("$.recordings.length()").value(uploads));
    }

    @Test
    @DisplayName("Deletes one sound: 204, it is gone, the others stay; an unknown one gives 404 NOT_FOUND")
    void deletesSound() throws Exception {
        long kept = idOf(upload(stageId, "audio/webm", 900, SOUND));
        long deleted = idOf(upload(stageId, "audio/webm", 900, SOUND));

        mockMvc().perform(delete("/api/recordings/" + deleted).cookie(session()).with(xsrf()))
            .andExpect(status().isNoContent());

        mockMvc().perform(get("/api/recordings/" + deleted).cookie(session()))
            .andExpect(status().isNotFound());
        mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andExpect(jsonPath("$.recordings.length()").value(1))
            .andExpect(jsonPath("$.recordings[0].id").value(kept));
        mockMvc().perform(delete("/api/recordings/" + deleted).cookie(session()).with(xsrf()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Files several sounds under each stage of a word, and lists them all in the word")
    void filesSoundsUnderEachStage() throws Exception {
        long laterStage = addStage("lapin", "mastered", "2026-10-14");
        long early = idOf(upload(stageId, "audio/webm", 900, SOUND));
        long late = idOf(upload(laterStage, "audio/webm", 900, SOUND));
        long lateAgain = idOf(upload(laterStage, "audio/webm", 900, SOUND));

        mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andExpect(jsonPath("$.recordings.length()").value(3))
            .andExpect(jsonPath("$.recordings[0].id").value(lateAgain))
            .andExpect(jsonPath("$.recordings[0].pronunciationId").value(laterStage))
            .andExpect(jsonPath("$.recordings[1].id").value(late))
            .andExpect(jsonPath("$.recordings[1].pronunciationId").value(laterStage))
            .andExpect(jsonPath("$.recordings[2].id").value(early))
            .andExpect(jsonPath("$.recordings[2].pronunciationId").value(stageId));
    }

    @Test
    @DisplayName("Hands a deleted stage's sounds to the stage before it, or after it for the oldest one")
    void movesSoundsOfDeletedStage() throws Exception {
        long middle = addStage("lapin", "almost", "2026-10-13");
        long last = addStage("lapin", "mastered", "2026-10-14");
        long fromMiddle = idOf(upload(middle, "audio/webm", 900, SOUND));
        long fromOldest = idOf(upload(stageId, "audio/webm", 900, SOUND));

        mockMvc().perform(delete("/api/pronunciations/" + middle).cookie(session()).with(xsrf()))
            .andExpect(status().isNoContent());
        mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andExpect(jsonPath(stageOfSound(fromMiddle)).value(contains(Math.toIntExact(stageId))));

        mockMvc().perform(delete("/api/pronunciations/" + stageId).cookie(session()).with(xsrf()))
            .andExpect(status().isNoContent());
        mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andExpect(jsonPath("$.recordings.length()").value(2))
            .andExpect(jsonPath(stageOfSound(fromMiddle)).value(contains(Math.toIntExact(last))))
            .andExpect(jsonPath(stageOfSound(fromOldest)).value(contains(Math.toIntExact(last))));
        mockMvc().perform(get("/api/recordings/" + fromOldest).cookie(session()))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Moves a sound to another stage of its word, and keeps its bytes")
    void movesSoundToAnotherStage() throws Exception {
        long laterStage = addStage("lapin", "mastered", "2026-10-14");
        long soundId = idOf(upload(stageId, "audio/webm", 900, SOUND));

        move(soundId, laterStage)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(soundId))
            .andExpect(jsonPath("$.pronunciationId").value(laterStage))
            .andExpect(jsonPath("$.durationMs").value(900));

        mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andExpect(jsonPath("$.recordings[0].pronunciationId").value(laterStage));
        mockMvc().perform(get("/api/recordings/" + soundId).cookie(session()))
            .andExpect(content().bytes(SOUND));
    }

    @Test
    @DisplayName("Refuses to move a sound to a stage of another word or an unknown one (400), or an unknown sound "
        + "(404)")
    void refusesInvalidMove() throws Exception {
        long otherStage = stageOf(createWord("chat", "ka", "learning", "2026-09-25"));
        long soundId = idOf(upload(stageId, "audio/webm", 900, SOUND));

        move(soundId, otherStage)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        move(soundId, 999_999)
            .andExpect(status().isBadRequest());
        mockMvc().perform(put("/api/recordings/" + soundId).cookie(session()).with(xsrf())
                .contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest());
        move(999_999, stageId)
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andExpect(jsonPath("$.recordings[0].pronunciationId").value(stageId));
    }

    @Test
    @DisplayName("Adds a sound trimmed in the browser as WAV and serves it back as WAV")
    void addsTrimmedWavSound() throws Exception {
        long recordingId = idOf(upload(stageId, "audio/wav", 800, SOUND)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.mimeType").value("audio/wav"))
            .andExpect(jsonPath("$.durationMs").value(800)));

        mockMvc().perform(get("/api/recordings/" + recordingId).cookie(session()))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "audio/wav"))
            .andExpect(content().bytes(SOUND));
    }

    @Test
    @DisplayName("Refuses a type other than webm, mp4 or wav audio with 415 UNSUPPORTED_MEDIA_TYPE")
    void refusesOtherType() throws Exception {
        upload(stageId, "audio/ogg", 1000, SOUND)
            .andExpect(status().isUnsupportedMediaType())
            .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    @DisplayName("Refuses a body above 2 MB with 413 PAYLOAD_TOO_LARGE")
    void refusesLargeBody() throws Exception {
        upload(stageId, "audio/webm", 1000, new byte[2 * 1024 * 1024 + 1])
            .andExpect(status().isContentTooLarge())
            .andExpect(jsonPath("$.code").value("PAYLOAD_TOO_LARGE"));
    }

    @Test
    @DisplayName("Refuses an empty body, a duration under 300 ms, over 15 s or missing with 400 INVALID_REQUEST")
    void refusesInvalidUpload() throws Exception {
        upload(stageId, "audio/webm", 1000, new byte[0])
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        upload(stageId, "audio/webm", 0, SOUND)
            .andExpect(status().isBadRequest());
        upload(stageId, "audio/webm", 299, SOUND)
            .andExpect(status().isBadRequest());
        upload(stageId, "audio/webm", 300, SOUND)
            .andExpect(status().isCreated());
        upload(stageId, "audio/webm", 15_001, SOUND)
            .andExpect(status().isBadRequest());
        mockMvc().perform(post("/api/pronunciations/" + stageId + "/recordings").cookie(session()).with(xsrf())
                .contentType("audio/webm").content(SOUND))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("Refuses a sound for an unknown stage, and an unknown recording, with 404 NOT_FOUND")
    void refusesUnknownIds() throws Exception {
        upload(999_999, "audio/webm", 1000, SOUND)
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc().perform(get("/api/recordings/999999").cookie(session()))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Refuses an upload without session (401) and a deletion without CSRF token (403)")
    void refusesUnauthenticatedWrites() throws Exception {
        long recordingId = idOf(upload(stageId, "audio/webm", 900, SOUND));

        mockMvc().perform(post("/api/pronunciations/" + stageId + "/recordings").param("durationMs", "900").with(xsrf())
                .contentType("audio/webm").content(SOUND))
            .andExpect(status().isUnauthorized());
        mockMvc().perform(delete("/api/recordings/" + recordingId).cookie(session()))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Deletes the sounds of a word along with it")
    void deletesSoundsWithWord() throws Exception {
        long recordingId = idOf(upload(stageId, "audio/webm", 1000, SOUND));

        mockMvc().perform(delete("/api/words/" + wordId).cookie(session()).with(xsrf()))
            .andExpect(status().isNoContent());

        mockMvc().perform(get("/api/recordings/" + recordingId).cookie(session()))
            .andExpect(status().isNotFound());
    }

    /**
     * Files a sound under a stage.
     *
     * @param stage       stage identifier
     * @param contentType upload content type
     * @param durationMs  announced duration
     * @param data        audio bytes
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions upload(long stage, String contentType, int durationMs, byte[] data) throws Exception {
        return mockMvc().perform(post("/api/pronunciations/" + stage + "/recordings")
            .param("durationMs", Integer.toString(durationMs))
            .cookie(session())
            .with(xsrf())
            .contentType(contentType)
            .content(data));
    }

    /**
     * Moves a sound to a stage.
     *
     * @param soundId recording identifier
     * @param stage   stage receiving it
     * @return result of the request
     * @throws Exception when the request fails
     */
    private ResultActions move(long soundId, long stage) throws Exception {
        return mockMvc().perform(put("/api/recordings/" + soundId).cookie(session()).with(xsrf())
            .contentType("application/json").content("{\"pronunciationId\": " + stage + "}"));
    }

    /**
     * Reads the id of the first stage of a word.
     *
     * @param word word identifier
     * @return stage identifier
     * @throws Exception when the request fails
     */
    private long stageOf(long word) throws Exception {
        return firstStageId(mockMvc().perform(get("/api/words/" + word).cookie(session()))
            .andReturn().getResponse().getContentAsString());
    }

    /**
     * Adds a stage to the word.
     *
     * @param spoken what the child said
     * @param status stage status code
     * @param date   stage date
     * @return stage identifier
     * @throws Exception when the request fails
     */
    private long addStage(String spoken, String status, String date) throws Exception {
        String added = mockMvc().perform(post("/api/words/" + wordId + "/pronunciations").cookie(session())
                .with(xsrf()).contentType("application/json").content(stageJson(spoken, status, date)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(added, "$.id").longValue();
    }

    /**
     * Path to the stage of one sound in a word response; it matches a list, holding that one stage.
     *
     * @param soundId recording identifier
     * @return JSON path
     */
    private static String stageOfSound(long soundId) {
        return "$.recordings[?(@.id == " + soundId + ")].pronunciationId";
    }

    /**
     * Reads the id of a recording response.
     *
     * @param result upload result
     * @return recording identifier
     * @throws Exception when the body cannot be read
     */
    private static long idOf(ResultActions result) throws Exception {
        return JsonPath.<Number>read(result.andReturn().getResponse().getContentAsString(), "$.id").longValue();
    }
}
