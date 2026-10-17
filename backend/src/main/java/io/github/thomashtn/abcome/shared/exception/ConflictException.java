package io.github.thomashtn.abcome.shared.exception;

/**
 * Signals a request that clashes with the current data; answered with 409, its code and its message.
 */
public class ConflictException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Stable application code the frontend branches on, such as {@code WORD_ALREADY_EXISTS}.
     */
    private final String code;

    /**
     * Creates the exception.
     *
     * @param code    stable application code
     * @param message error message exposed by the API
     */
    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    /**
     * Returns the application code of the conflict.
     *
     * @return stable application code
     */
    public String getCode() {
        return code;
    }
}
