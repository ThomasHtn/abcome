package io.github.thomashtn.abcome.recording.service;

import io.github.thomashtn.abcome.recording.dto.RecordingContent;
import io.github.thomashtn.abcome.word.dto.RecordingResponse;
import java.io.InputStream;

/**
 * Sounds of the words, filed under their stages, any number per stage.
 */
public interface RecordingService {

    /**
     * Files a sound under a stage of a word.
     *
     * @param pronunciationId stage identifier
     * @param contentType     {@code Content-Type} of the upload, codec parameters allowed
     * @param durationMs      length measured by the browser
     * @param body            raw audio body
     * @return the stored sound, without its bytes
     * @throws io.github.thomashtn.abcome.shared.exception.InvalidRequestException       empty body or bad duration
     * @throws io.github.thomashtn.abcome.shared.exception.UnsupportedMediaTypeException not webm or mp4 audio
     * @throws io.github.thomashtn.abcome.shared.exception.PayloadTooLargeException      above the size limit
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException     unknown stage
     */
    RecordingResponse add(Long pronunciationId, String contentType, int durationMs, InputStream body);

    /**
     * Reads a sound to play it.
     *
     * @param id recording identifier
     * @return bytes and type
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     */
    RecordingContent find(Long id);

    /**
     * Files a sound under another stage of its word.
     *
     * @param id              recording identifier
     * @param pronunciationId stage receiving it
     * @return the moved sound, without its bytes
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException unknown recording
     * @throws io.github.thomashtn.abcome.shared.exception.InvalidRequestException   stage unknown or of another word
     */
    RecordingResponse move(Long id, Long pronunciationId);

    /**
     * Deletes a sound.
     *
     * @param id recording identifier
     * @throws io.github.thomashtn.abcome.shared.exception.ResourceNotFoundException when unknown
     */
    void delete(Long id);
}
