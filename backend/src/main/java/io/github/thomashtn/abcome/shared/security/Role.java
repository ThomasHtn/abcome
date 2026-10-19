package io.github.thomashtn.abcome.shared.security;

/**
 * What a signed-in visitor may do, decided by the password they typed.
 */
public enum Role {

    /**
     * Family member signed in with the family password: reads and writes the notebook.
     */
    FAMILY,

    /**
     * Relative signed in with the reader password: reads the notebook, never changes it.
     */
    READER;

    /**
     * Spring Security authority of the role, as {@code hasRole} expects it.
     *
     * @return authority name, such as {@code ROLE_FAMILY}
     */
    public String authority() {
        return "ROLE_" + name();
    }
}
