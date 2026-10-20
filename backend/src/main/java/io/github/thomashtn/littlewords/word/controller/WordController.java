package io.github.thomashtn.littlewords.word.controller;

import io.github.thomashtn.littlewords.shared.exception.ApiErrorResponse;
import io.github.thomashtn.littlewords.word.dto.CreateWordRequest;
import io.github.thomashtn.littlewords.word.dto.UpdateWordRequest;
import io.github.thomashtn.littlewords.word.dto.WordResponse;
import io.github.thomashtn.littlewords.word.service.WordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Words of the notebook, each returned with all its pronunciation stages.
 */
@RestController
@RequestMapping("/api/words")
@Tag(name = "Words", description = "Words the child says, with their pronunciation stages.")
public class WordController {

    /**
     * Word service.
     */
    private final WordService wordService;

    /**
     * Creates the controller.
     *
     * @param wordService word service
     */
    public WordController(WordService wordService) {
        this.wordService = wordService;
    }

    /**
     * Lists every word; small enough to be sent whole, the browser searches and filters it.
     *
     * @return all words
     */
    @GetMapping
    @Operation(summary = "List every word with its stages")
    @ApiResponse(responseCode = "200", description = "All words, in creation order.")
    public List<WordResponse> findAll() {
        return wordService.findAll();
    }

    /**
     * Reads one word.
     *
     * @param id word identifier
     * @return the word
     */
    @GetMapping("/{id}")
    @Operation(summary = "Read a word with its stages")
    @ApiResponse(responseCode = "200", description = "The word.")
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown word.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public WordResponse findById(@PathVariable Long id) {
        return wordService.findById(id);
    }

    /**
     * Adds a word with its first stage.
     *
     * @param request label and first stage
     * @return 201 with the word and its location
     */
    @PostMapping
    @Operation(summary = "Add a word with its first stage")
    @ApiResponse(responseCode = "201", description = "The created word.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: invalid field or date in the future.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "WORD_ALREADY_EXISTS: same word, whatever its case or accents.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<WordResponse> create(@Valid @RequestBody CreateWordRequest request) {
        WordResponse created = wordService.create(request);
        return ResponseEntity.created(URI.create("/api/words/" + created.id())).body(created);
    }

    /**
     * Renames a word.
     *
     * @param id      word identifier
     * @param request new label
     * @return the renamed word
     */
    @PutMapping("/{id}")
    @Operation(summary = "Rename a word")
    @ApiResponse(responseCode = "200", description = "The renamed word.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: empty or too long label.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown word.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "WORD_ALREADY_EXISTS: another word has this label.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public WordResponse rename(@PathVariable Long id, @Valid @RequestBody UpdateWordRequest request) {
        return wordService.rename(id, request);
    }

    /**
     * Deletes a word with its stages and recordings.
     *
     * @param id word identifier
     * @return 204
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a word with its whole history")
    @ApiResponse(responseCode = "204", description = "Deleted, stages and recordings included.")
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown word.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        wordService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
