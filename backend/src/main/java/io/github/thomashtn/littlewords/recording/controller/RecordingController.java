package io.github.thomashtn.littlewords.recording.controller;

import io.github.thomashtn.littlewords.recording.dto.MoveRecordingRequest;
import io.github.thomashtn.littlewords.recording.dto.RecordingContent;
import io.github.thomashtn.littlewords.recording.service.RecordingService;
import io.github.thomashtn.littlewords.shared.exception.ApiErrorResponse;
import io.github.thomashtn.littlewords.word.dto.RecordingResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.io.InputStream;
import java.net.URI;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sounds of the words: uploaded raw under a stage, played back, moved to another stage and deleted by id.
 */
@RestController
@Tag(name = "Recordings", description = "Short sounds of the child saying a word.")
public class RecordingController {

    /**
     * A recording never changes: a new sound gets a new id, so the browser may keep it for a year.
     */
    private static final String CACHE_CONTROL = "private, max-age=31536000, immutable";

    /**
     * Recording service.
     */
    private final RecordingService recordingService;

    /**
     * Creates the controller.
     *
     * @param recordingService recording service
     */
    public RecordingController(RecordingService recordingService) {
        this.recordingService = recordingService;
    }

    /**
     * Files a sound under a stage of a word.
     *
     * @param id          stage identifier
     * @param durationMs  length measured by the browser
     * @param contentType upload type, codec parameters allowed
     * @param body        raw audio body
     * @return the stored sound, without its bytes, and its playback URL
     */
    @PostMapping(value = "/api/pronunciations/{id}/recordings", consumes = {"audio/webm", "audio/mp4", "audio/wav"})
    @Operation(
        summary = "Add a sound to a pronunciation stage",
        requestBody = @RequestBody(content = {
            @Content(mediaType = "audio/webm", schema = @Schema(type = "string", format = "binary")),
            @Content(mediaType = "audio/mp4", schema = @Schema(type = "string", format = "binary")),
            @Content(mediaType = "audio/wav", schema = @Schema(type = "string", format = "binary"))
        })
    )
    @ApiResponse(responseCode = "201", description = "The stored sound; Location is its playback URL.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: empty body or duration out of range.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown stage.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "413", description = "PAYLOAD_TOO_LARGE: above 2 MB.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "415", description = "UNSUPPORTED_MEDIA_TYPE: not audio/webm, audio/mp4 or audio/wav.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<RecordingResponse> add(
        @PathVariable Long id,
        @RequestParam int durationMs,
        @RequestHeader(HttpHeaders.CONTENT_TYPE) String contentType,
        InputStream body
    ) {
        RecordingResponse created = recordingService.add(id, contentType, durationMs, body);
        return ResponseEntity.created(URI.create("/api/recordings/" + created.id())).body(created);
    }

    /**
     * Plays a sound; returned as a resource so Spring answers byte-range requests with 206.
     *
     * <p>iOS Safari only plays media from servers that honour {@code Range}.</p>
     *
     * @param id recording identifier
     * @return the audio bytes with their type, cacheable forever
     */
    @GetMapping("/api/recordings/{id}")
    @Operation(summary = "Play a sound")
    @ApiResponse(responseCode = "200", description = "Audio bytes.",
        content = @Content(mediaType = "audio/webm", schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(responseCode = "206", description = "Requested byte range of the audio.",
        content = @Content(mediaType = "audio/webm", schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown recording.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<Resource> find(@PathVariable Long id) {
        RecordingContent content = recordingService.find(id);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(content.mimeType()))
            .header(HttpHeaders.CACHE_CONTROL, CACHE_CONTROL)
            .body(new ByteArrayResource(content.data()));
    }

    /**
     * Files a sound under another stage of its word.
     *
     * @param id      recording identifier
     * @param request stage receiving it
     * @return the moved sound, without its bytes
     */
    @PutMapping("/api/recordings/{id}")
    @Operation(summary = "Move a sound to another pronunciation stage of its word")
    @ApiResponse(responseCode = "200", description = "The moved sound.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: stage missing, unknown or of another word.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown recording.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public RecordingResponse move(
        @PathVariable Long id,
        @org.springframework.web.bind.annotation.RequestBody @Valid MoveRecordingRequest request
    ) {
        return recordingService.move(id, request.pronunciationId());
    }

    /**
     * Deletes a sound.
     *
     * @param id recording identifier
     * @return no content
     */
    @DeleteMapping("/api/recordings/{id}")
    @Operation(summary = "Delete a sound")
    @ApiResponse(responseCode = "204", description = "Deleted.")
    @ApiResponse(responseCode = "404", description = "NOT_FOUND: unknown recording.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        recordingService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
