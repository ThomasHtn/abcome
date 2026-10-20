package io.github.thomashtn.littlewords.export;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import io.github.thomashtn.littlewords.support.NotebookApiTest;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

/**
 * Specifies the export: the whole notebook as one zip archive, its description and every sound as a file.
 */
@TestPropertySource(properties = {"app.branding.name=Les Mots d'Élise", "app.branding.name-accent="})
class ExportApiTest extends NotebookApiTest {

    /**
     * Fake audio bytes: the archive holds them as stored.
     */
    private static final byte[] SOUND = "fake webm bytes".getBytes(StandardCharsets.UTF_8);

    @Test
    @DisplayName("Downloads the notebook as a zip named after the app: notebook.json, then each sound as a file")
    void downloadsArchive() throws Exception {
        long wordId = createWord("lapin", "apin", "almost", "2026-10-12");
        long soundId = upload(stageOf(wordId), "audio/webm", SOUND);
        createWord("maman", "mama", "mastered", "2026-10-10");

        byte[] archive = mockMvc().perform(get("/api/export").cookie(session()))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/zip"))
            .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"les-mots-d-elise-" + LocalDate.now(ZoneId.of("Europe/Paris")) + ".zip\""))
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andReturn().getResponse().getContentAsByteArray();

        Map<String, byte[]> files = unzip(archive);
        assertThat(files.keySet()).first().isEqualTo("notebook.json");
        String manifest = new String(files.get("notebook.json"), StandardCharsets.UTF_8);
        assertThat(JsonPath.<String>read(manifest, "$.app")).isEqualTo("Les Mots d'Élise");
        assertThat(JsonPath.<String>read(manifest, "$.childName")).isEqualTo(CHILD_NAME);
        assertThat(JsonPath.<List<String>>read(manifest, "$.entries[*].label")).containsExactly("lapin", "maman");
        assertThat(JsonPath.<String>read(manifest, "$.entries[0].pronunciations[0].spoken")).isEqualTo("apin");
        String file = JsonPath.read(manifest, "$.entries[0].sounds[0].file");
        assertThat(file).matches("sounds/lapin/\\d{4}-\\d{2}-\\d{2} apin \\(" + soundId + "\\)\\.webm");
        assertThat(files.get(file)).isEqualTo(SOUND);
        assertThat(JsonPath.<List<Object>>read(manifest, "$.entries[1].sounds")).isEmpty();
    }

    @Test
    @DisplayName("Names a sound's folder after a sentence without the characters file systems refuse")
    void keepsFileNamesSafe() throws Exception {
        String body = mockMvc().perform(post("/api/words").cookie(session()).with(xsrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"kind": "sentence", "label": "Où est le chat ?",
                     "pronunciation": {"spoken": "é chat ?", "status": "learning", "date": "2026-10-12"}}
                    """))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        upload(firstStageId(body), "audio/mp4", SOUND);

        Map<String, byte[]> files = unzip(mockMvc().perform(get("/api/export").cookie(session()))
            .andReturn().getResponse().getContentAsByteArray());

        assertThat(files.keySet())
            .anyMatch(name -> name.matches("sounds/Où est le chat _/[^/]+ é chat _ \\(\\d+\\)\\.m4a"));
    }

    @Test
    @DisplayName("Lets a reader download the notebook, since it only reads")
    void letsReaderDownload() throws Exception {
        createWord("lapin", "apin", "almost", "2026-10-12");

        byte[] archive = mockMvc().perform(get("/api/export").cookie(signInAsReader()))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();

        assertThat(unzip(archive)).containsKey("notebook.json");
    }

    @Test
    @DisplayName("Refuses a visitor without a session with 401")
    void refusesVisitor() throws Exception {
        mockMvc().perform(get("/api/export")).andExpect(status().isUnauthorized());
    }

    /**
     * Uploads a sound under a stage.
     *
     * @param stageId     stage identifier
     * @param contentType audio type
     * @param data        audio bytes
     * @return recording identifier
     * @throws Exception when the request fails
     */
    private long upload(long stageId, String contentType, byte[] data) throws Exception {
        String body = mockMvc().perform(post("/api/pronunciations/" + stageId + "/recordings")
                .param("durationMs", "1200")
                .cookie(session())
                .with(xsrf())
                .contentType(contentType)
                .content(data))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(body, "$.id").longValue();
    }

    /**
     * Reads the first stage of a word through the API.
     *
     * @param wordId word identifier
     * @return stage identifier
     * @throws Exception when the request fails
     */
    private long stageOf(long wordId) throws Exception {
        return firstStageId(mockMvc().perform(get("/api/words/" + wordId).cookie(session()))
            .andReturn().getResponse().getContentAsString());
    }

    /**
     * Reads every file of an archive, in archive order.
     *
     * @param archive zip bytes
     * @return contents by path
     * @throws IOException when the archive is malformed
     */
    private static Map<String, byte[]> unzip(byte[] archive) throws IOException {
        Map<String, byte[]> files = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive), StandardCharsets.UTF_8)) {
            for (ZipEntry entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                files.put(entry.getName(), zip.readAllBytes());
            }
        }
        return files;
    }
}
