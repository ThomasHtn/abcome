package io.github.thomashtn.littlewords.auth.controller;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.littlewords.auth.dto.LoginRequest;
import io.github.thomashtn.littlewords.auth.dto.SessionResponse;
import io.github.thomashtn.littlewords.auth.service.AuthService;
import io.github.thomashtn.littlewords.shared.config.ApplicationProperties;
import io.github.thomashtn.littlewords.shared.exception.ApiErrorResponse;
import io.github.thomashtn.littlewords.shared.exception.UnauthorizedException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Family session: check, login with the family or the reader password, logout.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Family session opened by the family or the read-only password.")
public class AuthController {

    /**
     * Opens, checks and closes the session.
     */
    private final AuthService authService;

    /**
     * Writes the session cookie, to renew its lifetime on each check.
     */
    private final CookieSerializer cookieSerializer;

    /**
     * First name of the child, sent only to a signed-in visitor.
     */
    private final String childName;

    /**
     * Creates the controller.
     *
     * @param authService      session service
     * @param cookieSerializer session cookie writer
     * @param properties       application settings, holding the child's name
     */
    @SuppressFBWarnings(
        value = "EI_EXPOSE_REP2",
        justification = "CookieSerializer is the shared Spring Session bean, configured once at startup."
    )
    public AuthController(
        AuthService authService, CookieSerializer cookieSerializer, ApplicationProperties properties
    ) {
        this.authService = authService;
        this.cookieSerializer = cookieSerializer;
        this.childName = properties.childName();
    }

    /**
     * Tells the frontend whether it is signed in, and hands it the CSRF cookie for its next write.
     *
     * <p>Spring Session writes its cookie only when the id changes, so its {@code Max-Age} would run
     * from the login; rewriting it here, at each app start, makes the 30 days an idle timeout.</p>
     *
     * @param csrfToken CSRF token of the request; reading it writes the {@code XSRF-TOKEN} cookie
     * @param request   current request, holding the session
     * @param response  response receiving the renewed session cookie
     * @return 200 with the session inside one
     */
    @GetMapping("/session")
    @Operation(summary = "Check the session", description = "Also sets the XSRF-TOKEN cookie.")
    @ApiResponse(responseCode = "200", description = "Signed in.")
    @ApiResponse(responseCode = "401", description = "UNAUTHENTICATED: no valid session.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<SessionResponse> session(
        CsrfToken csrfToken, HttpServletRequest request, HttpServletResponse response
    ) {
        // The token is deferred: without this read, the cookie would never reach a fresh visitor.
        csrfToken.getToken();
        if (!authService.isSignedIn()) {
            throw new UnauthorizedException("UNAUTHENTICATED", "Sign in to open the notebook.");
        }
        HttpSession session = request.getSession(false);
        if (session != null) {
            cookieSerializer.writeCookieValue(new CookieSerializer.CookieValue(request, response, session.getId()));
        }
        return ResponseEntity.ok(sessionResponse());
    }

    /**
     * Opens a session with the family password, or a read-only one with the reader password.
     *
     * @param loginRequest password typed by the family member
     * @param request      current request
     * @param response     current response, receiving the session cookie
     * @return 200 with the session and its cookie
     */
    @PostMapping("/login")
    @Operation(summary = "Sign in with the family or the reader password")
    @ApiResponse(responseCode = "200", description = "Signed in; the session cookie is set.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: empty or oversized password.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "INVALID_CREDENTIALS: wrong password.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "429", description = "TOO_MANY_ATTEMPTS: address locked out, see Retry-After.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<SessionResponse> login(
        @Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response
    ) {
        authService.login(loginRequest.password(), request, response);
        return ResponseEntity.ok(sessionResponse());
    }

    /**
     * Closes the session.
     *
     * @param request current request
     * @return 204, signed in or not
     */
    @PostMapping("/logout")
    @Operation(summary = "Sign out")
    @ApiResponse(responseCode = "204", description = "Signed out; the session cookie is expired.")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(request);
        return ResponseEntity.noContent().build();
    }

    /**
     * Describes the open session, naming the child only to a signed-in visitor.
     *
     * @return session of the current request
     */
    private SessionResponse sessionResponse() {
        return new SessionResponse(childName, authService.isReadOnly());
    }
}
