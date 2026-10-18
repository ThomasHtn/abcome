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
import io.github.thomashtn.abcome.word.service.PronunciationService;
import io.github.thomashtn.abcome.word.service.WordService;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Sounds stored in PostgreSQL, any number per stage of a word.
 *
 * <p>The upload is checked and read before any transaction starts, so a slow phone never holds a
 * database connection while it sends its bytes.</p>
 */
@Service
public class DefaultRecordingService implements RecordingService {

    /**
     * Audio types the browsers record in, webm (Chrome, Firefox) and mp4 (Safari), plus wav for a trimmed sound.
     */
    private static final Set<String> ACCEPTED_TYPES = Set.of("audio/webm", "audio/mp4", "audio/wav");

    /**
     * Message of an unknown recording.
     */
    private static final String NOT_FOUND_MESSAGE = "Recording not found.";

    /**
     * Recording storage.
     */
    private final RecordingRepository recordingRepository;

    /**
     * Reads the stage receiving a sound, to know its word.
     */
    private final PronunciationService pronunciationService;

    /**
     * Word lock, so a sound is never added to a word or a stage being deleted.
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
     * @param recordingRepository  recording storage
     * @param pronunciationService stage reader
     * @param wordService          word lock
     * @param transactionTemplate  transaction runner
     * @param properties           application settings holding the limits
     * @param clock                application clock
     */
    @SuppressFBWarnings(
        value = "EI_EXPOSE_REP2",
        justification = "Repository, service and transaction template are stateless singletons shared on purpose; "
            + "SpotBugs only deems them mutable because they declare delete or setter methods."
    )
    public DefaultRecordingService(
        RecordingRepository recordingRepository,
        PronunciationService pronunciationService,
        WordService wordService,
        TransactionTemplate transactionTemplate,
        ApplicationProperties properties,
        Clock clock
    ) {
        this.recordingRepository = recordingRepository;
        this.pronunciationService = pronunciationService;
        this.wordService = wordService;
        this.transactionTemplate = transactionTemplate;
        this.maxBytes = properties.recording().maxBytes();
        this.minDurationMs = properties.recording().minDurationMs();
        this.maxDurationMs = properties.recording().maxDurationMs();
        this.clock = clock;
    }

    /**
     * Checks type and duration, reads the bounded body, then files the sound under its stage in one transaction.
     *
     * <p>The word row is locked first, then the stage read again: a concurrent deletion of the word or
     * the stage either runs before (404) or waits, and a deleted word takes the new sound with it.</p>
     *
     * @param pronunciationId stage identifier
     * @param contentType     upload content type
     * @param durationMs      length measured by the browser
     * @param body            raw audio body
     * @return the stored sound, without its bytes
     */
    @Override
    public RecordingResponse add(Long pronunciationId, String contentType, int durationMs, InputStream body) {
        String mimeType = acceptedMimeType(contentType);
        if (durationMs < minDurationMs || durationMs > maxDurationMs) {
            throw new InvalidRequestException(
                "A recording lasts from " + minDurationMs + " ms to " + maxDurationMs + " ms."
            );
        }
        byte[] data = readBounded(body);

        // PostgreSQL keeps microseconds: truncating now returns the same instant as any later read.
        Instant createdAt = clock.instant().truncatedTo(ChronoUnit.MICROS);
        return transactionTemplate.execute(status -> {
            Long wordId = pronunciationService.findById(pronunciationId).wordId();
            wordService.lockForUpdate(wordId);
            // Read again under the lock: the stage may have been deleted while waiting.
            pronunciationService.findById(pronunciationId);
            Recording saved = recordingRepository.saveAndFlush(
                new Recording(wordId, pronunciationId, data, mimeType, durationMs, createdAt)
            );
            return new RecordingResponse(
                saved.getId(), saved.getWordId(), saved.getPronunciationId(), saved.getMimeType(),
                saved.getDurationMs(), saved.getCreatedAt()
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
     * Locks the sound's word, checks the stage belongs to it, then moves the sound without reading its bytes.
     *
     * <p>The word lock queues the move behind a concurrent deletion of the target stage, which would
     * otherwise leave the sound on a stage that no longer exists.</p>
     *
     * @param id              recording identifier
     * @param pronunciationId stage receiving it
     * @return the moved sound, without its bytes
     */
    @Override
    @Transactional
    public RecordingResponse move(Long id, Long pronunciationId) {
        Long wordId = recordingRepository.findWordIdById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
        wordService.lockForUpdate(wordId);
        if (!isStageOf(pronunciationId, wordId)) {
            throw new InvalidRequestException("A sound moves to another pronunciation of its own word only.");
        }
        recordingRepository.moveTo(id, pronunciationId);
        return recordingRepository.findResponseById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
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
     * Tells whether a stage exists and belongs to a word.
     *
     * @param pronunciationId stage identifier
     * @param wordId          word identifier
     * @return {@code true} when it is one of the word's stages
     */
    private boolean isStageOf(Long pronunciationId, Long wordId) {
        try {
            return pronunciationService.findById(pronunciationId).wordId().equals(wordId);
        } catch (ResourceNotFoundException exception) {
            return false;
        }
    }

    /**
     * Reduces the content type to its accepted base type, dropping codec parameters.
     *
     * @param contentType upload content type
     * @return {@code audio/webm}, {@code audio/mp4} or {@code audio/wav}
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
        throw new UnsupportedMediaTypeException("A recording is audio/webm, audio/mp4 or audio/wav.");
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
