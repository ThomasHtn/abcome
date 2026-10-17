package io.github.thomashtn.abcome.recording.service;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.abcome.recording.dto.RecordingContent;
import io.github.thomashtn.abcome.recording.entity.Recording;
import io.github.thomashtn.abcome.recording.repository.RecordingRepository;
import io.github.thomashtn.abcome.shared.config.ApplicationProperties;
import io.github.thomashtn.abcome.shared.exception.InvalidRequestException;
import io.github.thomashtn.abcome.shared.exception.PayloadTooLargeException;
import io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException;
import io.github.thomashtn.abcome.shared.exception.UnsupportedMediaTypeException;
import io.github.thomashtn.abcome.word.dto.RecordingResponse;
import io.github.thomashtn.abcome.word.service.WordService;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Sounds stored in PostgreSQL, any number per word.
 *
 * <p>The upload is checked and read before any transaction starts, so a slow phone never holds a
 * database connection while it sends its bytes.</p>
 */
@Service
public class DefaultRecordingService implements RecordingService {

    /**
     * Audio types the browsers record in: webm (Chrome, Firefox) and mp4 (Safari).
     */
    private static final Set<String> ACCEPTED_TYPES = Set.of("audio/webm", "audio/mp4");

    /**
     * Message of an unknown recording.
     */
    private static final String NOT_FOUND_MESSAGE = "Recording not found.";

    /**
     * Recording storage.
     */
    private final RecordingRepository recordingRepository;

    /**
     * Word lock, so a sound is never added to a word being deleted.
     */
    private final WordService wordService;

    /**
     * Runs the insertion in one short transaction.
     */
    private final TransactionTemplate transactionTemplate;

    /**
     * Largest accepted body, in bytes.
     */
    private final int maxBytes;

    /**
     * Shortest accepted duration, in milliseconds: shorter is a mistaken tap.
     */
    private final int minDurationMs;

    /**
     * Longest accepted duration, in milliseconds.
     */
    private final int maxDurationMs;

    /**
     * Application clock.
     */
    private final Clock clock;

    /**
     * Creates the service.
     *
     * @param recordingRepository recording storage
     * @param wordService         word lock
     * @param transactionTemplate transaction runner
     * @param properties          application settings holding the limits
     * @param clock               application clock
     */
    @SuppressFBWarnings(
        value = "EI_EXPOSE_REP2",
        justification = "Repository, service and transaction template are stateless singletons shared on purpose; "
            + "SpotBugs only deems them mutable because they declare delete or setter methods."
    )
    public DefaultRecordingService(
        RecordingRepository recordingRepository,
        WordService wordService,
        TransactionTemplate transactionTemplate,
        ApplicationProperties properties,
        Clock clock
    ) {
        this.recordingRepository = recordingRepository;
        this.wordService = wordService;
        this.transactionTemplate = transactionTemplate;
        this.maxBytes = properties.recording().maxBytes();
        this.minDurationMs = properties.recording().minDurationMs();
        this.maxDurationMs = properties.recording().maxDurationMs();
        this.clock = clock;
    }

    /**
     * Checks type and duration, reads the bounded body, then inserts the sound in one transaction.
     *
     * <p>The word row is locked first, so a concurrent deletion of the word either runs before (404)
     * or waits and takes the new sound with it.</p>
     *
     * @param wordId      word identifier
     * @param contentType upload content type
     * @param durationMs  length measured by the browser
     * @param body        raw audio body
     * @return the stored sound, without its bytes
     */
    @Override
    public RecordingResponse add(Long wordId, String contentType, int durationMs, InputStream body) {
        String mimeType = acceptedMimeType(contentType);
        if (durationMs < minDurationMs || durationMs > maxDurationMs) {
            throw new InvalidRequestException(
                "A recording lasts from " + minDurationMs + " ms to " + maxDurationMs + " ms."
            );
        }
        byte[] data = readBounded(body);

        // PostgreSQL keeps microseconds: truncating now returns the same instant as any later read.
        Recording recording = new Recording(
            wordId, data, mimeType, durationMs, clock.instant().truncatedTo(ChronoUnit.MICROS)
        );
        return transactionTemplate.execute(status -> {
            wordService.lockForUpdate(wordId);
            Recording saved = recordingRepository.saveAndFlush(recording);
            return new RecordingResponse(
                saved.getId(), saved.getWordId(), saved.getMimeType(), saved.getDurationMs(), saved.getCreatedAt()
            );
        });
    }

    /**
     * Reads the recording with its bytes.
     *
     * @param id recording identifier
     * @return bytes and type
     */
    @Override
    @Transactional(readOnly = true)
    public RecordingContent find(Long id) {
        Recording recording = recordingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
        return new RecordingContent(recording.getData(), recording.getMimeType());
    }

    /**
     * Deletes the sound without reading its bytes.
     *
     * @param id recording identifier
     */
    @Override
    @Transactional
    public void delete(Long id) {
        if (recordingRepository.deleteRecordingById(id) == 0) {
            throw new ResourceNotFoundException(NOT_FOUND_MESSAGE);
        }
    }

    /**
     * Reduces the content type to its accepted base type, dropping codec parameters.
     *
     * @param contentType upload content type
     * @return {@code audio/webm} or {@code audio/mp4}
     */
    private static String acceptedMimeType(String contentType) {
        try {
            MediaType mediaType = MediaType.parseMediaType(contentType);
            String mimeType = mediaType.getType() + "/" + mediaType.getSubtype();
            if (ACCEPTED_TYPES.contains(mimeType)) {
                return mimeType;
            }
        } catch (InvalidMediaTypeException exception) {
            // Unreadable type: refused below like any other.
        }
        throw new UnsupportedMediaTypeException("A recording is audio/webm or audio/mp4.");
    }

    /**
     * Reads at most one byte past the limit, so an oversized body is refused without being kept.
     *
     * @param body raw audio body
     * @return the bytes
     */
    private byte[] readBounded(InputStream body) {
        try {
            byte[] data = body.readNBytes(maxBytes + 1);
            if (data.length > maxBytes) {
                throw new PayloadTooLargeException("A recording is at most " + maxBytes + " bytes.");
            }
            if (data.length == 0) {
                throw new InvalidRequestException("The recording is empty.");
            }
            return data;
        } catch (IOException exception) {
            throw new UncheckedIOException("The recording could not be read.", exception);
        }
    }
}
