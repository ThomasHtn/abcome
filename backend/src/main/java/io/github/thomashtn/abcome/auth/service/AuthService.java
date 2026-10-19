package io.github.thomashtn.abcome.auth.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Opens, checks and closes the family session.
 */
public interface AuthService {

    /**
     * Checks the family then the reader password and, when one is right, opens a session with a fresh id.
     *
     * @param password password typed by the family member, never logged
     * @param request  current request, giving the caller's address and the session
     * @param response current response, receiving the session cookie
     * @throws io.github.thomashtn.abcome.shared.exception.TooManyRequestsException while the address is locked out
     * @throws io.github.thomashtn.abcome.shared.exception.UnauthorizedException   when the password is wrong
     */
    void login(String password, HttpServletRequest request, HttpServletResponse response);

    /**
     * Closes the current session, if any; signing out twice is not an error.
     *
     * @param request current request
     */
    void logout(HttpServletRequest request);

    /**
     * Tells whether the current request belongs to a signed-in family member.
     *
     * @return {@code true} inside a valid session
     */
    boolean isSignedIn();

    /**
     * Tells whether the current visitor may only read the notebook, having typed the reader password.
     *
     * @return {@code true} for a reader, or outside a session
     */
    boolean isReadOnly();
}
