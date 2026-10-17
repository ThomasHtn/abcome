package io.github.thomashtn.abcome.shared.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Converts exceptions into {@link ApiErrorResponse} problem payloads.
 *
 * <p>Every caller mistake gets its own 4xx handler; anything else reaches the catch-all, is logged
 * and answered with a generic 500 that never echoes an internal message.</p>
 *
 * <p>The {@code code} values are a contract with the frontend, listed in {@code docs/spec.md}:
 * change one on both sides or not at all.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Application logger.
     */
    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Code of any request the API cannot accept as sent: bad value, missing field, malformed body.
     */
    private static final String INVALID_REQUEST = "INVALID_REQUEST";

    /**
     * Code of an unknown resource, whether an entity or a route.
     */
    private static final String NOT_FOUND = "NOT_FOUND";

    /**
     * Clock stamping each problem response.
     */
    private final Clock clock;

    /**
     * Creates the handler.
     *
     * @param clock application clock
     */
    public GlobalExceptionHandler(Clock clock) {
        this.clock = clock;
    }

    /**
     * Handles an unknown application resource.
     *
     * @param exception not-found exception, whose message is written for the caller
     * @param request   current HTTP request
     * @return 404 response
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ApiErrorResponse> handleResourceNotFound(
        ResourceNotFoundException exception, HttpServletRequest request
    ) {
        return problem(HttpStatus.NOT_FOUND, NOT_FOUND, exception.getMessage(), request);
    }

    /**
     * Handles bean validation failures, listing the first error of each field.
     *
     * @param exception validation exception
     * @param request   current HTTP request
     * @return 400 response with field errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> handleValidationFailure(
        MethodArgumentNotValidException exception, HttpServletRequest request
    ) {
        Map<String, String> errors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
            .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return problem(HttpStatus.BAD_REQUEST, INVALID_REQUEST, "One or more fields are invalid.", request, errors);
    }

    /**
     * Handles a request value rejected by the application.
     *
     * @param exception invalid-request exception, whose message is written for the caller
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(InvalidRequestException.class)
    ResponseEntity<ApiErrorResponse> handleInvalidRequest(
        InvalidRequestException exception, HttpServletRequest request
    ) {
        return problem(HttpStatus.BAD_REQUEST, INVALID_REQUEST, exception.getMessage(), request);
    }

    /**
     * Handles a parameter that cannot be converted to its type; the raw value is not echoed back.
     *
     * @param exception type-mismatch exception
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiErrorResponse> handleTypeMismatch(
        MethodArgumentTypeMismatchException exception, HttpServletRequest request
    ) {
        String detail = "Parameter '" + exception.getName() + "' has an invalid value.";
        return problem(HttpStatus.BAD_REQUEST, INVALID_REQUEST, detail, request);
    }

    /**
     * Handles a body that cannot be read, such as malformed JSON or an unknown enum value.
     *
     * @param exception unreadable-body exception
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiErrorResponse> handleUnreadableBody(
        HttpMessageNotReadableException exception, HttpServletRequest request
    ) {
        String detail = "The request body is malformed or holds an unsupported value.";
        return problem(HttpStatus.BAD_REQUEST, INVALID_REQUEST, detail, request);
    }

    /**
     * Handles a missing required query parameter.
     *
     * @param exception missing-parameter exception
     * @param request   current HTTP request
     * @return 400 response
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ApiErrorResponse> handleMissingParameter(
        MissingServletRequestParameterException exception, HttpServletRequest request
    ) {
        String detail = "Parameter '" + exception.getParameterName() + "' is required.";
        return problem(HttpStatus.BAD_REQUEST, INVALID_REQUEST, detail, request);
    }

    /**
     * Handles a wrong password or a missing session.
     *
     * @param exception unauthorized exception, carrying its code
     * @param request   current HTTP request
     * @return 401 response
     */
    @ExceptionHandler(UnauthorizedException.class)
    ResponseEntity<ApiErrorResponse> handleUnauthorized(UnauthorizedException exception, HttpServletRequest request) {
        return problem(HttpStatus.UNAUTHORIZED, exception.getCode(), exception.getMessage(), request);
    }

    /**
     * Handles a request that clashes with the current data.
     *
     * @param exception conflict exception, carrying its code
     * @param request   current HTTP request
     * @return 409 response
     */
    @ExceptionHandler(ConflictException.class)
    ResponseEntity<ApiErrorResponse> handleConflict(ConflictException exception, HttpServletRequest request) {
        return problem(HttpStatus.CONFLICT, exception.getCode(), exception.getMessage(), request);
    }

    /**
     * Handles a body above the accepted size.
     *
     * @param exception payload-too-large exception
     * @param request   current HTTP request
     * @return 413 response
     */
    @ExceptionHandler(PayloadTooLargeException.class)
    ResponseEntity<ApiErrorResponse> handlePayloadTooLarge(
        PayloadTooLargeException exception, HttpServletRequest request
    ) {
        return problem(HttpStatus.CONTENT_TOO_LARGE, "PAYLOAD_TOO_LARGE", exception.getMessage(), request);
    }

    /**
     * Handles a content type refused by the application.
     *
     * @param exception unsupported-media-type exception
     * @param request   current HTTP request
     * @return 415 response
     */
    @ExceptionHandler(UnsupportedMediaTypeException.class)
    ResponseEntity<ApiErrorResponse> handleUnsupportedMediaType(
        UnsupportedMediaTypeException exception, HttpServletRequest request
    ) {
        return problem(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", exception.getMessage(), request);
    }

    /**
     * Handles a content type no route accepts, refused by Spring MVC before any controller.
     *
     * @param exception exception raised by the {@code consumes} condition
     * @param request   current HTTP request
     * @return 415 response
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleMediaTypeNotSupported(
        HttpMediaTypeNotSupportedException exception, HttpServletRequest request
    ) {
        String detail = "This content type is not accepted here.";
        return problem(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", detail, request);
    }

    /**
     * Handles a caller locked out after too many attempts, telling it when to retry.
     *
     * @param exception too-many-requests exception, carrying the wait
     * @param request   current HTTP request
     * @return 429 response with a {@code Retry-After} header in seconds
     */
    @ExceptionHandler(TooManyRequestsException.class)
    ResponseEntity<ApiErrorResponse> handleTooManyRequests(
        TooManyRequestsException exception, HttpServletRequest request
    ) {
        ApiErrorResponse body = ApiErrorResponse.of(
            HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS", exception.getMessage(),
            request.getRequestURI(), clock.instant()
        );
        // Rounded up, so a client waiting exactly this long is never refused once more.
        long seconds = Math.max(1, (exception.getRetryAfter().toMillis() + 999) / 1000);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, Long.toString(seconds))
            .body(body);
    }

    /**
     * Handles a path this API does not expose.
     *
     * @param exception exception raised for an unmapped path
     * @param request   current HTTP request
     * @return 404 response
     */
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiErrorResponse> handleNoResourceFound(
        NoResourceFoundException exception, HttpServletRequest request
    ) {
        String detail = "The requested resource does not exist.";
        return problem(HttpStatus.NOT_FOUND, NOT_FOUND, detail, request);
    }

    /**
     * Handles an HTTP method the matched route does not accept.
     *
     * @param exception exception raised for an unsupported method
     * @param request   current HTTP request
     * @return 405 response
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
        HttpRequestMethodNotSupportedException exception, HttpServletRequest request
    ) {
        String detail = "The " + request.getMethod() + " method is not supported by this resource.";
        return problem(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", detail, request);
    }

    /**
     * Handles any exception without a more specific handler.
     *
     * @param exception unexpected exception, logged with its stack trace
     * @param request   current HTTP request
     * @return 500 response
     */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception, HttpServletRequest request) {
        LOGGER.error("Unexpected error while processing {} {}",
            request.getMethod(), request.getRequestURI(), exception);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred.", request);
    }

    /**
     * Builds a problem response without field errors.
     *
     * @param status  HTTP status
     * @param code    application error code
     * @param detail  caller-facing explanation
     * @param request current HTTP request
     * @return response carrying the problem
     */
    private ResponseEntity<ApiErrorResponse> problem(
        HttpStatus status, String code, String detail, HttpServletRequest request
    ) {
        return problem(status, code, detail, request, Map.of());
    }

    /**
     * Builds a problem response.
     *
     * @param status  HTTP status
     * @param code    application error code
     * @param detail  caller-facing explanation
     * @param request current HTTP request
     * @param errors  first validation error of each invalid field
     * @return response carrying the problem
     */
    private ResponseEntity<ApiErrorResponse> problem(
        HttpStatus status, String code, String detail, HttpServletRequest request, Map<String, String> errors
    ) {
        ApiErrorResponse body =
            ApiErrorResponse.of(status, code, detail, request.getRequestURI(), clock.instant(), errors);
        return ResponseEntity.status(status).body(body);
    }
}
