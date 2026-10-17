package io.github.thomashtn.abcome.dictionary.controller;

import io.github.thomashtn.abcome.dictionary.dto.DictionaryEntryResponse;
import io.github.thomashtn.abcome.dictionary.service.DictionaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dictionary of common first words, behind the add-a-word suggestions.
 */
@RestController
@RequestMapping("/api/dictionary")
@Tag(name = "Dictionary", description = "Common first words offered as suggestions.")
public class DictionaryController {

    /**
     * The dictionary only changes with a deployment, so a browser may keep it for a day.
     */
    private static final String CACHE_CONTROL = "private, max-age=86400";

    /**
     * Dictionary source.
     */
    private final DictionaryService dictionaryService;

    /**
     * Creates the controller.
     *
     * @param dictionaryService dictionary service
     */
    public DictionaryController(DictionaryService dictionaryService) {
        this.dictionaryService = dictionaryService;
    }

    /**
     * Lists the whole dictionary.
     *
     * @return every entry, earliest acquired first
     */
    @GetMapping
    @Operation(summary = "List the dictionary")
    @ApiResponse(responseCode = "200", description = "Every entry, earliest acquired words first.")
    public ResponseEntity<List<DictionaryEntryResponse>> findAll() {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, CACHE_CONTROL).body(dictionaryService.findAll());
    }
}
