package io.github.thomashtn.abcome.word.controller;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.abcome.shared.exception.ApiErrorResponse;
import io.github.thomashtn.abcome.word.dto.PronunciationRequest;
import io.github.thomashtn.abcome.word.dto.PronunciationResponse;
import io.github.thomashtn.abcome.word.service.PronunciationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pronunciation stages: added under a word, then addressed by their own id.
 */
@RestController
@Tag(name = "Pronunciations", description = "Stages of a word: how the child said it on a given day.")
public class PronunciationController {

    /**
     * Stage service.
     */
    private final PronunciationService pronunciationService;

    /**
     * Creates the controller.
     *
     * @param pronunciationService stage service
     */
    @SuppressFBWarnings(
        value = "EI_EXPOSE_REP2",
        justification = "PronunciationService is a stateless singleton shared on purpose; "
            + "SpotBugs only deems it mutable because it declares delete."
    )
    public PronunciationController(PronunciationService pronunciationService) {
        this.pronunciationService = pronunciationService;
    }

    /**
     * Adds a stage to a word.
     *
     * @param wordId  word identifier
     * @param request new stage
     * @return 201 with the stage and its location
     */
    @PostMapping("/api/words/{wordId}/pronunciations")
    @Operation(summary = "Add a stage to a word")
    @ApiResponse(responseCode = "201", description = "The created stage.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: invalid field or date in the future.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown word.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<PronunciationResponse> add(
        @PathVariable Long wordId, @Valid @RequestBody PronunciationRequest request
    ) {
        PronunciationResponse created = pronunciationService.add(wordId, request);
        return ResponseEntity.created(URI.create("/api/pronunciations/" + created.id())).body(created);
    }

    /**
     * Rewrites a stage.
     *
     * @param id      stage identifier
     * @param request new values
     * @return the updated stage
     */
    @PutMapping("/api/pronunciations/{id}")
    @Operation(summary = "Rewrite a stage")
    @ApiResponse(responseCode = "200", description = "The updated stage.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: invalid field or date in the future.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown stage.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public PronunciationResponse update(@PathVariable Long id, @Valid @RequestBody PronunciationRequest request) {
        return pronunciationService.update(id, request);
    }

    /**
     * Deletes a stage; the word keeps its sounds.
     *
     * @param id stage identifier
     * @return 204
     */
    @DeleteMapping("/api/pronunciations/{id}")
    @Operation(summary = "Delete a stage")
    @ApiResponse(responseCode = "204", description = "Deleted; the word keeps its sounds.")
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown stage.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "LAST_PRONUNCIATION: the only stage of its word.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        pronunciationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
