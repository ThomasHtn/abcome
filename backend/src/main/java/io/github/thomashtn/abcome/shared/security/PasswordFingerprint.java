package io.github.thomashtn.abcome.shared.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * SHA-256 of the configured password hash, stored in each session to tell which password opened it.
 *
 * <p>The hash itself never goes into the session table; its fingerprint is enough to notice that the
 * password changed since the session was opened.</p>
 *
 * @param value hexadecimal SHA-256 of the password hash
 */
public record PasswordFingerprint(String value) {

    /**
     * Computes the fingerprint of a password hash.
     *
     * @param passwordHash configured Argon2id hash
     * @return its fingerprint
     */
    public static PasswordFingerprint of(String passwordHash) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(passwordHash.getBytes(StandardCharsets.UTF_8));
            return new PasswordFingerprint(HexFormat.of().formatHex(digest));
        } catch (NoSuchAlgorithmException exception) {
            // Every Java platform must provide SHA-256, so this cannot happen.
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }
}
