package io.github.thomashtn.littlewords.shared.text;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Checks {@link ReadableLabel}: the normalized label must not be empty.
 */
public class ReadableLabelValidator implements ConstraintValidator<ReadableLabel, String> {

    /**
     * Accepts a label whose comparison key is not empty; a missing or blank one is left to {@code @NotBlank}.
     *
     * @param label   label as received
     * @param context validation context
     * @return {@code true} when the label is missing, blank or readable
     */
    @Override
    public boolean isValid(String label, ConstraintValidatorContext context) {
        return label == null || label.isBlank() || !Labels.normalize(label).isEmpty();
    }
}
