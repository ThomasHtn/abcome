package io.github.thomashtn.abcome.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Family password typed on the login screen.
 *
 * @param password plain password, checked then dropped; capped so a huge body cannot slow Argon2
 */
@Schema(description = "Login with the family password.")
public record LoginRequest(
    @Schema(description = "Family password.", example = "a long family passphrase")
    @NotBlank @Size(max = 200) String password
) {

    /**
     * Masks the password, so a log line or an error report never prints it.
     *
     * @return description without the password
     */
    @Override
    public String toString() {
        return "LoginRequest[password=***]";
    }
}
