package io.github.thomashtn.abcome.sentence.controller;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.abcome.sentence.dto.SentenceRequest;
import io.github.thomashtn.abcome.sentence.dto.SentenceResponse;
import io.github.thomashtn.abcome.sentence.service.SentenceService;
import io.github.thomashtn.abcome.shared.exception.ApiErrorResponse;
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
 * Sentences of the notebook.
 */
@RestController
@RequestMapping("/api/sentences")
@Tag(name = "Sentences", description = "Sentences Côme says, with what he meant.")
public class SentenceController {

    /**
     * Sentence service.
     */
    private final SentenceService sentenceService;

    /**
     * Creates the controller.
     *
     * @param sentenceService sentence service
     */
    @SuppressFBWarnings(
        value = "EI_EXPOSE_REP2",
        justification = "SentenceService is a stateless singleton shared on purpose; "
            + "SpotBugs only deems it mutable because it declares delete."
    )
    public SentenceController(SentenceService sentenceService) {
        this.sentenceService = sentenceService;
    }

    /**
     * Lists every sentence.
     *
     * @return all sentences, newest first
     */
    @GetMapping
    @Operation(summary = "List every sentence")
    @ApiResponse(responseCode = "200", description = "All sentences, newest first.")
    public List<SentenceResponse> findAll() {
        return sentenceService.findAll();
    }

    /**
     * Adds a sentence.
     *
     * @param request new sentence
     * @return 201 with the sentence and its location
     */
    @PostMapping
    @Operation(summary = "Add a sentence")
    @ApiResponse(responseCode = "201", description = "The created sentence.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: invalid field or date in the future.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<SentenceResponse> create(@Valid @RequestBody SentenceRequest request) {
        SentenceResponse created = sentenceService.create(request);
        return ResponseEntity.created(URI.create("/api/sentences/" + created.id())).body(created);
    }

    /**
     * Rewrites a sentence.
     *
     * @param id      sentence identifier
     * @param request new values
     * @return the updated sentence
     */
    @PutMapping("/{id}")
    @Operation(summary = "Rewrite a sentence")
    @ApiResponse(responseCode = "200", description = "The updated sentence.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: invalid field or date in the future.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown sentence.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public SentenceResponse update(@PathVariable Long id, @Valid @RequestBody SentenceRequest request) {
        return sentenceService.update(id, request);
    }

    /**
     * Deletes a sentence.
     *
     * @param id sentence identifier
     * @return 204
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a sentence")
    @ApiResponse(responseCode = "204", description = "Deleted.")
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown sentence.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        sentenceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
