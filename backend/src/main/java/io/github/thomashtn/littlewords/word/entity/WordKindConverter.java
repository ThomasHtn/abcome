package io.github.thomashtn.littlewords.word.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores a {@link WordKind} as its lower-case code.
 */
@Converter(autoApply = true)
public class WordKindConverter implements AttributeConverter<WordKind, String> {

    /**
     * Writes the code.
     *
     * @param kind kind, or null
     * @return its code, or null
     */
    @Override
    public String convertToDatabaseColumn(WordKind kind) {
        return kind == null ? null : kind.code();
    }

    /**
     * Reads the code.
     *
     * @param code stored code, or null
     * @return the kind, or null
     */
    @Override
    public WordKind convertToEntityAttribute(String code) {
        return code == null ? null : WordKind.fromCode(code);
    }
}
