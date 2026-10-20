package io.github.thomashtn.littlewords.export.controller;

import io.github.thomashtn.littlewords.export.service.ExportService;
import io.github.thomashtn.littlewords.shared.exception.ApiErrorResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Download of the whole notebook, for family members and readers alike: it only reads.
 */
@RestController
@Tag(name = "Export", description = "The whole notebook in one archive, to keep a copy of every word and sound.")
public class ExportController {

    /**
     * Type of the archive.
     */
    private static final String ZIP = "application/zip";

    /**
     * Export service.
     */
    private final ExportService exportService;

    /**
     * Creates the controller.
     *
     * @param exportService export service
     */
    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    /**
     * Streams the archive straight to the response, without holding it in memory, named for the
     * browser's download.
     *
     * @param response servlet response receiving the archive
     * @throws IOException when the client leaves mid-download
     */
    @GetMapping(value = "/api/export", produces = ZIP)
    @Operation(summary = "Download the whole notebook as a zip archive")
    @ApiResponse(responseCode = "200",
        description = "notebook.json (words, stages, sounds) and every sound as a file under sounds/.",
        content = @Content(mediaType = ZIP, schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(responseCode = "401", description = "UNAUTHENTICATED: no session.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public void export(HttpServletResponse response) throws IOException {
        response.setContentType(ZIP);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(exportService.fileName()).build().toString());
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        exportService.writeArchive(response.getOutputStream());
    }
}
