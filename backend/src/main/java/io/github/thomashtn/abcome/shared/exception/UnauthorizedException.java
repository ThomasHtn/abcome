package io.github.thomashtn.abcome.shared.exception;

/**
 * Signals a caller who is not, or could not be, signed in; answered with 401, its code and its message.
 */
public class UnauthorizedException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Stable application code, such as {@code INVALID_CREDENTIALS} or {@code UNAUTHENTICATED}.
     */
    private final String code;

    /**
     * Creates the exception.
     *
     * @param code    stable application code
     * @param message error message exposed by the API
     */
    public UnauthorizedException(String code, String message) {
        super(message);
        this.code = code;
    }

    /**
     * Returns the application code of the refusal.
     *
     * @return stable application code
     */
    public String getCode() {
        return code;
    }
}
