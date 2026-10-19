package io.github.thomashtn.littlewords.recording.dto;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;

/**
 * Sound to send back to the browser.
 *
 * @param data     audio bytes
 * @param mimeType audio type
 */
@SuppressFBWarnings(
    value = "EI_EXPOSE_REP",
    justification = "The bytes are written once to the response and never changed; a copy would be wasted memory."
)
public record RecordingContent(byte[] data, String mimeType) {
}
