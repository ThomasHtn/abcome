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
    @DisplayName("Lists the IFDC dictionary, earliest acquired words first, cacheable for a day")
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
    @DisplayName("Keeps the dictionary behind the family session")
    void needsSession() throws Exception {
        mockMvc().perform(get("/api/dictionary"))
            .andExpect(status().isUnauthorized());
    }
}
