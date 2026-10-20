package io.github.thomashtn.littlewords.export.service;

import java.io.IOException;
import java.io.OutputStream;

/**
 * The whole notebook as one zip archive, so a family keeps its own copy of every word and sound.
 */
public interface ExportService {

    /**
     * Names today's archive after the app ({@code little-words-2026-10-20.zip}).
     *
     * @return file name, ASCII only
     */
    String fileName();

    /**
     * Writes the archive: {@code notebook.json} first, then one audio file per sound under
     * {@code sounds/<entry>/}. Sounds are read one at a time, so memory never holds them all.
     *
     * @param out stream receiving the archive, left open
     * @throws IOException when the stream fails, such as a client leaving mid-download
     */
    void writeArchive(OutputStream out) throws IOException;
}
