package io.github.thomashtn.littlewords.shared.text;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Requires a label that still holds something once normalized, so an invisible word is refused.
 *
 * <p>A label made only of combining marks passes {@code @NotBlank} but normalizes to nothing: it
 * would show as an empty card and block every other such label as a duplicate.</p>
 */
@Documented
@Constraint(validatedBy = ReadableLabelValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ReadableLabel {

    /**
     * Message of the field error.
     *
     * @return message shown in the API error
     */
    String message() default "must contain at least one visible character";

    /**
     * Validation groups, unused.
     *
     * @return groups
     */
    Class<?>[] groups() default {};

    /**
     * Payload, unused.
     *
     * @return payload
     */
    Class<? extends Payload>[] payload() default {};
}
