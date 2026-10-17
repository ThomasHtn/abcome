package io.github.thomashtn.abcome.shared.exception;

import java.time.Duration;

/**
 * Signals a caller locked out for a while; answered with 429 and a {@code Retry-After} header.
 */
public class TooManyRequestsException extends RuntimeException {

    /**
     * Serialization identifier.
     */
    private static final long serialVersionUID = 1L;

    /**
     * Time the caller must wait before trying again.
     */
    private final Duration retryAfter;

    /**
     * Creates the exception.
     *
     * @param retryAfter time the caller must wait
     * @param message    error message exposed by the API
     */
    public TooManyRequestsException(Duration retryAfter, String message) {
        super(message);
        this.retryAfter = retryAfter;
    }

    /**
     * Returns the time the caller must wait.
     *
     * @return wait before the next attempt
     */
    public Duration getRetryAfter() {
        return retryAfter;
    }
}
