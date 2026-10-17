package io.github.thomashtn.abcome.auth.controller;

import io.github.thomashtn.abcome.auth.dto.LoginRequest;
import io.github.thomashtn.abcome.auth.service.AuthService;
import io.github.thomashtn.abcome.shared.exception.ApiErrorResponse;
import io.github.thomashtn.abcome.shared.exception.UnauthorizedException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Family session: check, login with the shared password, logout.
 */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Family session opened by the shared password.")
public class AuthController {

    /**
     * Opens, checks and closes the session.
     */
    private final AuthService authService;

    /**
     * Creates the controller.
     *
     * @param authService session service
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Tells the frontend whether it is signed in, and hands it the CSRF cookie for its next write.
     *
     * @param csrfToken CSRF token of the request; reading it writes the {@code XSRF-TOKEN} cookie
     * @return 204 inside a session
     */
    @GetMapping("/session")
    @Operation(summary = "Check the session", description = "Also sets the XSRF-TOKEN cookie.")
    @ApiResponse(responseCode = "204", description = "Signed in.")
    @ApiResponse(responseCode = "401", description = "UNAUTHENTICATED: no valid session.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<Void> session(CsrfToken csrfToken) {
        // The token is deferred: without this read, the cookie would never reach a fresh visitor.
        csrfToken.getToken();
        if (!authService.isSignedIn()) {
            throw new UnauthorizedException("UNAUTHENTICATED", "Sign in to open the notebook.");
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * Opens a session with the family password.
     *
     * @param loginRequest password typed by the family member
     * @param request      current request
     * @param response     current response, receiving the session cookie
     * @return 204 with the session cookie
     */
    @PostMapping("/login")
    @Operation(summary = "Sign in with the family password")
    @ApiResponse(responseCode = "204", description = "Signed in; the session cookie is set.")
    @ApiResponse(responseCode = "400", description = "INVALID_REQUEST: empty or oversized password.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "INVALID_CREDENTIALS: wrong password.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    @ApiResponse(responseCode = "429", description = "TOO_MANY_ATTEMPTS: address locked out, see Retry-After.",
        content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    public ResponseEntity<Void> login(
        @Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response
    ) {
        authService.login(loginRequest.password(), request, response);
        return ResponseEntity.noContent().build();
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
}
