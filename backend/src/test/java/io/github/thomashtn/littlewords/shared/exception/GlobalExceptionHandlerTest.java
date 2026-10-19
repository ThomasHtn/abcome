package io.github.thomashtn.littlewords.shared.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Specifies how failures are rendered as {@link ApiErrorResponse}.
 */
class GlobalExceptionHandlerTest {

    /**
     * Instant every response is stamped with.
     */
    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    /**
     * Handler under test, stamping responses with a fixed clock.
     */
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler(Clock.fixed(NOW, ZoneOffset.UTC));

    /**
     * Request every failure is reported for.
     */
    private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/words/42");

    @Test
    @DisplayName("Renders a missing resource as 404 with the caller-facing message")
    void rendersResourceNotFound() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleResourceNotFound(new ResourceNotFoundException("Word not found."), request);

        assertError(response, HttpStatus.NOT_FOUND, "NOT_FOUND");
        assertThat(response.getBody().detail()).isEqualTo("Word not found.");
        assertThat(response.getBody().instance()).hasToString("/api/words/42");
        assertThat(response.getBody().title()).isEqualTo("Not Found");
        assertThat(response.getBody().timestamp()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("Renders an invalid request as 400 with the caller-facing message")
    void rendersInvalidRequest() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleInvalidRequest(new InvalidRequestException("The date cannot be in the future."), request);

        assertError(response, HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
        assertThat(response.getBody().detail()).isEqualTo("The date cannot be in the future.");
    }

    @Test
    @DisplayName("Names the parameter of a type mismatch without echoing its value")
    void rendersTypeMismatch() throws NoSuchMethodException {
        MethodParameter parameter = new MethodParameter(String.class.getMethod("charAt", int.class), 0);
        MethodArgumentTypeMismatchException exception =
            new MethodArgumentTypeMismatchException("abc", Integer.class, "page", parameter, null);

        ResponseEntity<ApiErrorResponse> response = handler.handleTypeMismatch(exception, request);

        assertError(response, HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
        assertThat(response.getBody().detail()).contains("page").doesNotContain("abc");
    }

    @Test
    @DisplayName("Lists the first validation error of each invalid field")
    void rendersValidationFailure() throws NoSuchMethodException {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "word");
        bindingResult.addError(new FieldError("word", "label", "must not be blank"));
        bindingResult.addError(new FieldError("word", "label", "size must be at most 60"));
        bindingResult.addError(new FieldError("word", "spoken", "must not be blank"));
        MethodParameter parameter = new MethodParameter(String.class.getMethod("charAt", int.class), 0);

        ResponseEntity<ApiErrorResponse> response = handler.handleValidationFailure(
            new MethodArgumentNotValidException(parameter, bindingResult), request);

        assertError(response, HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
        assertThat(response.getBody().errors())
            .containsEntry("label", "must not be blank")
            .containsEntry("spoken", "must not be blank")
            .hasSize(2);
    }

    @Test
    @DisplayName("Renders a malformed body as 400 without echoing the parser message")
    void rendersUnreadableBody() {
        HttpMessageNotReadableException exception =
            new HttpMessageNotReadableException("Unexpected token", new MockHttpInputMessage(new byte[0]));

        ResponseEntity<ApiErrorResponse> response = handler.handleUnreadableBody(exception, request);

        assertError(response, HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
        assertThat(response.getBody().detail()).doesNotContain("Unexpected token");
    }

    @Test
    @DisplayName("Renders an unknown route as 404 rather than a server fault")
    void rendersNoResource() {
        NoResourceFoundException exception = new NoResourceFoundException(HttpMethod.GET, "/api/nope", "api/nope");

        ResponseEntity<ApiErrorResponse> response = handler.handleNoResourceFound(exception, request);

        assertError(response, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    @Test
    @DisplayName("Renders an unsupported method as 405")
    void rendersMethodNotSupported() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleMethodNotSupported(new HttpRequestMethodNotSupportedException("DELETE"), request);

        assertError(response, HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED");
    }

    @Test
    @DisplayName("Hides the internal message of an unexpected failure")
    void hidesUnexpectedFailure() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleUnexpectedException(new IllegalStateException("secret internals"), request);

        assertError(response, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR");
        assertThat(response.getBody().detail()).doesNotContain("secret");
    }

    @Test
    @DisplayName("Renders a body above the size limit as 413")
    void rendersPayloadTooLarge() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handlePayloadTooLarge(new PayloadTooLargeException("Too big."), request);

        assertError(response, HttpStatus.CONTENT_TOO_LARGE, "PAYLOAD_TOO_LARGE");
    }

    @Test
    @DisplayName("Renders a content type refused by the application as 415")
    void rendersUnsupportedMediaType() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleUnsupportedMediaType(new UnsupportedMediaTypeException("Not audio."), request);

        assertError(response, HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE");
    }

    @Test
    @DisplayName("Renders a content type no route accepts as 415")
    void rendersMediaTypeNotSupported() {
        ResponseEntity<ApiErrorResponse> response = handler.handleMediaTypeNotSupported(
            new HttpMediaTypeNotSupportedException("text/plain"), request);

        assertError(response, HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE");
    }

    @Test
    @DisplayName("Renders a conflict as 409 with its own code")
    void rendersConflict() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleConflict(new ConflictException("WORD_ALREADY_EXISTS", "Already there."), request);

        assertError(response, HttpStatus.CONFLICT, "WORD_ALREADY_EXISTS");
    }

    @Test
    @DisplayName("Renders a refused sign-in as 401 with its own code")
    void rendersUnauthorized() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleUnauthorized(new UnauthorizedException("INVALID_CREDENTIALS", "Wrong password."), request);

        assertError(response, HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
    }

    @Test
    @DisplayName("Renders a lockout as 429 with Retry-After rounded up to the next second")
    void rendersTooManyRequests() {
        ResponseEntity<ApiErrorResponse> response = handler.handleTooManyRequests(
            new TooManyRequestsException(Duration.ofMillis(61_200), "Wait."), request);

        assertError(response, HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS");
        assertThat(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("62");
    }

    @Test
    @DisplayName("Renders a missing query parameter as 400 rather than a server fault")
    void rendersMissingParameter() {
        ResponseEntity<ApiErrorResponse> response = handler.handleMissingParameter(
            new MissingServletRequestParameterException("query", "String"), request);

        assertError(response, HttpStatus.BAD_REQUEST, "INVALID_REQUEST");
        assertThat(response.getBody().detail()).contains("query");
    }

    /**
     * Checks the status, repeated in the body, and the application code of a problem response.
     *
     * @param response problem response
     * @param status   expected HTTP status
     * @param code     expected application code
     */
    private static void assertError(ResponseEntity<ApiErrorResponse> response, HttpStatus status, String code) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(status.value());
        assertThat(response.getBody().code()).isEqualTo(code);
    }
}
