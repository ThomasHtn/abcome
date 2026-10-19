package io.github.thomashtn.littlewords.dictionary.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Stores a {@link WordCategory} as its lower-case code, the values the database check allows.
 */
@Converter(autoApply = true)
public class WordCategoryConverter implements AttributeConverter<WordCategory, String> {

    /**
     * Writes the code of a category.
     *
     * @param category category, never null in this schema
     * @return its code
     */
    @Override
    public String convertToDatabaseColumn(WordCategory category) {
        return category == null ? null : category.code();
    }

    /**
     * Reads a category from its code.
     *
     * @param code stored code
     * @return matching category
     */
    @Override
    public WordCategory convertToEntityAttribute(String code) {
        return code == null ? null : WordCategory.fromCode(code);
    }
}
