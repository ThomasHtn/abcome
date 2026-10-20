package io.github.thomashtn.littlewords.export.service;

import io.github.thomashtn.littlewords.export.dto.ExportedEntry;
import io.github.thomashtn.littlewords.export.dto.ExportedSound;
import io.github.thomashtn.littlewords.export.dto.NotebookExport;
import io.github.thomashtn.littlewords.recording.dto.RecordingContent;
import io.github.thomashtn.littlewords.recording.service.RecordingService;
import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import io.github.thomashtn.littlewords.shared.exception.ResourceNotFoundException;
import io.github.thomashtn.littlewords.word.dto.PronunciationResponse;
import io.github.thomashtn.littlewords.word.dto.RecordingResponse;
import io.github.thomashtn.littlewords.word.dto.WordResponse;
import io.github.thomashtn.littlewords.word.service.WordService;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/**
 * Archive built from the word and recording services, streamed entry by entry.
 */
@Service
public class DefaultExportService implements ExportService {

    /**
     * Path of the JSON description in the archive.
     */
    static final String MANIFEST = "notebook.json";

    /**
     * Folder of the audio files in the archive.
     */
    static final String SOUNDS_FOLDER = "sounds/";

    /**
     * Longest piece of a file name taken from a label or a spoken form; a sentence can be 200 characters.
     */
    private static final int MAX_NAME_PART = 60;

    /**
     * Characters no file system accepts in a name, replaced by an underscore.
     */
    private static final Pattern UNSAFE_NAME = Pattern.compile("[\\\\/:*?\"<>|\\p{Cntrl}]+");

    /**
     * Accents left by decomposing a name, dropped from the archive name.
     */
    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");

    /**
     * Runs of characters other than ASCII letters and digits, joined by a dash in the archive name.
     */
    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9]+");

    /**
     * File extension of each stored audio type, the one players recognise.
     */
    private static final Map<String, String> EXTENSIONS =
        Map.of("audio/webm", "webm", "audio/mp4", "m4a", "audio/wav", "wav");

    /**
     * Archive name when the app name has no ASCII letter or digit.
     */
    private static final String FALLBACK_NAME = "notebook";

    /**
     * Words, stages and sounds without their bytes.
     */
    private final WordService wordService;

    /**
     * Audio bytes, one sound at a time.
     */
    private final RecordingService recordingService;

    /**
     * App and child names written in the archive.
     */
    private final ApplicationProperties properties;

    /**
     * Writes {@code notebook.json} the way the API writes its responses.
     */
    private final ObjectMapper objectMapper;

    /**
     * Today and the export instant, in the family's zone.
     */
    private final Clock clock;

    /**
     * Creates the service.
     *
     * @param wordService      word service
     * @param recordingService recording service
     * @param properties       application settings
     * @param objectMapper     JSON mapper of the API
     * @param clock            application clock
     */
    public DefaultExportService(
        WordService wordService,
        RecordingService recordingService,
        ApplicationProperties properties,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.wordService = wordService;
        this.recordingService = recordingService;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /**
     * Names the archive after the app, accents dropped and spaces as dashes, then today's date.
     *
     * @return file name, ASCII only
     */
    @Override
    public String fileName() {
        String decomposed = Normalizer.normalize(properties.branding().name(), Normalizer.Form.NFD);
        String slug = NON_SLUG.matcher(COMBINING_MARKS.matcher(decomposed).replaceAll("").toLowerCase(Locale.ROOT))
            .replaceAll("-")
            .replaceAll("^-|-$", "");
        return (slug.isEmpty() ? FALLBACK_NAME : slug) + "-" + LocalDate.now(clock) + ".zip";
    }

    /**
     * Writes the description first, then each sound read on its own.
     *
     * @param out stream receiving the archive, left open
     * @throws IOException when the stream fails
     */
    @Override
    public void writeArchive(OutputStream out) throws IOException {
        List<ExportedEntry> entries = wordService.findAll().stream().map(this::entryOf).toList();
        NotebookExport export =
            new NotebookExport(properties.branding().name(), properties.childName(), Instant.now(clock), entries);
        // Not closed: closing would close the caller's stream, finish() completes the archive.
        ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8);
        zip.putNextEntry(new ZipEntry(MANIFEST));
        zip.write(objectMapper.writeValueAsBytes(export));
        zip.closeEntry();
        for (ExportedEntry entry : entries) {
            for (ExportedSound sound : entry.sounds()) {
                writeSound(zip, sound);
            }
        }
        zip.finish();
    }

    /**
     * Adds one sound's audio, dated from its recording; a sound deleted since the list was read is skipped.
     *
     * @param zip   archive being written
     * @param sound sound to add
     * @throws IOException when the stream fails
     */
    private void writeSound(ZipOutputStream zip, ExportedSound sound) throws IOException {
        RecordingContent content;
        try {
            content = recordingService.find(sound.id());
        } catch (ResourceNotFoundException deleted) {
            return;
        }
        ZipEntry file = new ZipEntry(sound.file());
        file.setTime(sound.createdAt().toEpochMilli());
        zip.putNextEntry(file);
        zip.write(content.data());
        zip.closeEntry();
    }

    /**
     * Describes an entry for the archive, naming the file of each sound.
     *
     * @param word entry as the API returns it
     * @return the entry in the archive
     */
    private ExportedEntry entryOf(WordResponse word) {
        List<ExportedSound> sounds = word.recordings().stream()
            .map(recording -> new ExportedSound(
                recording.id(),
                recording.pronunciationId(),
                soundPath(word, recording),
                recording.mimeType(),
                recording.durationMs(),
                recording.createdAt()))
            .toList();
        return new ExportedEntry(
            word.id(), word.kind(), word.label(), word.category(), word.createdAt(), word.pronunciations(), sounds);
    }

    /**
     * Path of a sound in the archive: its entry's folder, then the day it was recorded, what the child
     * says on it and its id, which keeps two sounds of a day apart.
     *
     * @param word      entry owning the sound
     * @param recording the sound
     * @return path such as {@code sounds/lapin/2026-10-12 apin (7).webm}
     */
    private String soundPath(WordResponse word, RecordingResponse recording) {
        String spoken = word.pronunciations().stream()
            .filter(stage -> stage.id().equals(recording.pronunciationId()))
            .map(PronunciationResponse::spoken)
            .findFirst()
            .orElse("");
        LocalDate day = LocalDate.ofInstant(recording.createdAt(), clock.getZone());
        String name = (day + " " + safeName(spoken)).strip() + " (" + recording.id() + ")";
        return SOUNDS_FOLDER + safeName(word.label()) + "/" + name + "."
            + EXTENSIONS.getOrDefault(recording.mimeType(), "audio");
    }

    /**
     * Makes a label fit in a file name on every system: no separator or reserved character, short.
     *
     * @param text label or spoken form
     * @return the text, safe and at most {@value #MAX_NAME_PART} characters long
     */
    private static String safeName(String text) {
        String safe = UNSAFE_NAME.matcher(text).replaceAll("_").strip();
        return safe.length() > MAX_NAME_PART ? safe.substring(0, MAX_NAME_PART).strip() : safe;
    }
}
