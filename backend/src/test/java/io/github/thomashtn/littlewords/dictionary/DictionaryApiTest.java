package io.github.thomashtn.littlewords.dictionary;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.thomashtn.littlewords.support.PostgreSqlIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

/**
 * Specifies the dictionary read by the add-a-word screen.
 */
class DictionaryApiTest extends PostgreSqlIntegrationTest {

    @Test
    @DisplayName("Lists the French IFDC dictionary by default, earliest acquired words first, cacheable for a day")
    void listsDictionary() throws Exception {
        mockMvc().perform(get("/api/dictionary").cookie(signIn()))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "private, max-age=86400"))
            .andExpect(jsonPath("$.length()").value(736))
            .andExpect(jsonPath("$[0].label").value("papa"))
            .andExpect(jsonPath("$[0].category").value("people"))
            .andExpect(jsonPath("$[0].frequent").value(true))
            .andExpect(jsonPath("$[?(@.label == 'lapin')].category").value("animals"))
            .andExpect(jsonPath("$[?(@.frequent == true)]", hasSize(24)));
    }

    @Test
    @DisplayName("Lists the English CDI dictionary when the interface speaks English")
    void listsEnglishDictionary() throws Exception {
        mockMvc().perform(get("/api/dictionary").param("language", "en").cookie(signIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(678))
            .andExpect(jsonPath("$[0].label").value("daddy"))
            .andExpect(jsonPath("$[?(@.label == 'teddy bear')].category").value("animals"))
            .andExpect(jsonPath("$[?(@.label == 'lapin')]", hasSize(0)))
            .andExpect(jsonPath("$[?(@.frequent == true)]", hasSize(24)));
    }

    @Test
    @DisplayName("Refuses a language the app does not speak")
    void refusesUnknownLanguage() throws Exception {
        mockMvc().perform(get("/api/dictionary").param("language", "de").cookie(signIn()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    @DisplayName("Keeps the dictionary behind the family session")
    void needsSession() throws Exception {
        mockMvc().perform(get("/api/dictionary"))
            .andExpect(status().isUnauthorized());
    }
}
