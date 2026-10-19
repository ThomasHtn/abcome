package io.github.thomashtn.littlewords.dictionary.controller;

import io.github.thomashtn.littlewords.dictionary.entity.DictionaryLanguage;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * Reads {@code ?language=en} into a {@link DictionaryLanguage}; an unknown code becomes a 400.
 */
@Component
public class DictionaryLanguageParameterConverter implements Converter<String, DictionaryLanguage> {

    /**
     * Reads a language from its query string code.
     *
     * @param code lower-case code
     * @return matching language
     */
    @Override
    public DictionaryLanguage convert(String code) {
        return DictionaryLanguage.fromCode(code);
    }
}
