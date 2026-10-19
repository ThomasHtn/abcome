package io.github.thomashtn.littlewords.shared.exception;

/**
 * Signals a request body above the accepted size; answered with 413 and its message.
 */
public class PayloadTooLargeException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Creates the exception with a message written for the caller.
     *
     * @param message error message exposed by the API
     */
    public PayloadTooLargeException(String message) {
        super(message);
    }
}
