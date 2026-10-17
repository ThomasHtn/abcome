package io.github.thomashtn.abcome.shared.exception;

/**
 * Signals a body whose content type the API does not accept; answered with 415 and its message.
 */
public class UnsupportedMediaTypeException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Creates the exception with a message written for the caller.
     *
     * @param message error message exposed by the API
     */
    public UnsupportedMediaTypeException(String message) {
        super(message);
    }
}
