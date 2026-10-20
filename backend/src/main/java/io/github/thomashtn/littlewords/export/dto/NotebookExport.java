package io.github.thomashtn.littlewords.export.dto;

import java.time.Instant;
import java.util.List;

/**
 * Content of {@code notebook.json}, at the root of the archive: everything the notebook holds but the
 * audio bytes, each sound naming its file in the archive.
 *
 * @param app        name of the app the archive comes from
 * @param childName  first name of the child
 * @param exportedAt instant the archive was made
 * @param entries    words and sentences, in creation order
 */
public record NotebookExport(String app, String childName, Instant exportedAt, List<ExportedEntry> entries) {

    /**
     * Copies the list so the export stays immutable.
     */
    public NotebookExport {
        entries = List.copyOf(entries);
    }
}
