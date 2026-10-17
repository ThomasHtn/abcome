package io.github.thomashtn.abcome.word.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores a {@link PronunciationStatus} as its lower-case code, the values the database check allows.
 */
@Converter(autoApply = true)
public class PronunciationStatusConverter implements AttributeConverter<PronunciationStatus, String> {

    /**
     * Writes the code of a status.
     *
     * @param status status, never null in this schema
     * @return its code
     */
    @Override
    public String convertToDatabaseColumn(PronunciationStatus status) {
        return status == null ? null : status.code();
    }

    /**
     * Reads a status from its code.
     *
     * @param code stored code
     * @return matching status
     */
    @Override
    public PronunciationStatus convertToEntityAttribute(String code) {
        return code == null ? null : PronunciationStatus.fromCode(code);
    }
}
