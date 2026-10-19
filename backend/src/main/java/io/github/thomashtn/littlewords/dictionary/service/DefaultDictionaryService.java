package io.github.thomashtn.littlewords.dictionary.service;

import io.github.thomashtn.littlewords.dictionary.dto.DictionaryEntryResponse;
import io.github.thomashtn.littlewords.dictionary.entity.DictionaryEntry;
import io.github.thomashtn.littlewords.dictionary.entity.DictionaryLanguage;
import io.github.thomashtn.littlewords.dictionary.entity.WordCategory;
import io.github.thomashtn.littlewords.dictionary.repository.DictionaryEntryRepository;
import io.github.thomashtn.littlewords.shared.text.Labels;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Dictionary loaded once from the database: it only changes with a migration, hence a restart.
 */
@Service
public class DefaultDictionaryService implements DictionaryService {

    /**
     * Source of the entries.
     */
    private final DictionaryEntryRepository repository;

    /**
     * Dictionary as read from the database, loaded on first use.
     */
    private Snapshot snapshot;

    /**
     * Creates the service.
     *
     * @param repository dictionary repository
     */
    public DefaultDictionaryService(DictionaryEntryRepository repository) {
        this.repository = repository;
    }

    /**
     * Returns the cached entries of one language.
     *
     * @param language language of the interface asking
     * @return every entry of that language
     */
    @Override
    public List<DictionaryEntryResponse> findAll(DictionaryLanguage language) {
        return snapshot().entriesByLanguage().getOrDefault(language, List.of());
    }

    /**
     * Looks the normalized label up in the cached map.
     *
     * @param label word as typed
     * @return its category, or custom
     */
    @Override
    public WordCategory categoryOf(String label) {
        return snapshot().categoriesByNormalizedLabel().getOrDefault(Labels.normalize(label), WordCategory.CUSTOM);
    }

    /**
     * Returns the dictionary, reading it on first call; synchronized because two first requests may race.
     *
     * @return loaded dictionary
     */
    private synchronized Snapshot snapshot() {
        if (snapshot == null) {
            List<DictionaryEntry> rows = repository.findAllByOrderByAcquisitionRankAsc();
            Map<DictionaryLanguage, List<DictionaryEntryResponse>> entries = rows.stream()
                .collect(Collectors.groupingBy(
                    DictionaryEntry::getLanguage,
                    () -> new EnumMap<>(DictionaryLanguage.class),
                    Collectors.mapping(
                        entry -> new DictionaryEntryResponse(entry.getLabel(), entry.getCategory(), entry.isFrequent()),
                        Collectors.toUnmodifiableList()
                    )
                ));
            // "la" and "là" share a key: the earlier acquired one, read first, keeps it. French is read before
            // English, so a word of both dictionaries keeps its French category.
            Map<String, WordCategory> categories = rows.stream()
                .sorted(Comparator.comparing(DictionaryEntry::getLanguage))
                .collect(Collectors.toUnmodifiableMap(
                    entry -> Labels.normalize(entry.getLabel()), DictionaryEntry::getCategory, (first, second) -> first
                ));
            snapshot = new Snapshot(entries, categories);
        }
        return snapshot;
    }

    /**
     * Loaded dictionary, in the two shapes the service serves.
     *
     * @param entriesByLanguage           entries of each language, earliest acquired words first
     * @param categoriesByNormalizedLabel categories keyed by normalized label, all languages together
     */
    private record Snapshot(
        Map<DictionaryLanguage, List<DictionaryEntryResponse>> entriesByLanguage,
        Map<String, WordCategory> categoriesByNormalizedLabel
    ) {
    }
}
