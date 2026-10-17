package io.github.thomashtn.abcome.dictionary.service;

import io.github.thomashtn.abcome.dictionary.dto.DictionaryEntryResponse;
import io.github.thomashtn.abcome.dictionary.entity.DictionaryEntry;
import io.github.thomashtn.abcome.dictionary.entity.WordCategory;
import io.github.thomashtn.abcome.dictionary.repository.DictionaryEntryRepository;
import io.github.thomashtn.abcome.shared.text.Labels;
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
     * Returns the cached entries.
     *
     * @return every entry
     */
    @Override
    public List<DictionaryEntryResponse> findAll() {
        return snapshot().entries();
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
            List<DictionaryEntryResponse> entries = rows.stream()
                .map(entry -> new DictionaryEntryResponse(entry.getLabel(), entry.getCategory(), entry.isFrequent()))
                .toList();
            // "la" and "là" share a key: the earlier acquired one, read first, keeps it.
            Map<String, WordCategory> categories = rows.stream().collect(Collectors.toUnmodifiableMap(
                entry -> Labels.normalize(entry.getLabel()), DictionaryEntry::getCategory, (first, second) -> first
            ));
            snapshot = new Snapshot(entries, categories);
        }
        return snapshot;
    }

    /**
     * Loaded dictionary, in the two shapes the service serves.
     *
     * @param entries                     entries, earliest acquired words first
     * @param categoriesByNormalizedLabel categories keyed by normalized label
     */
    private record Snapshot(
        List<DictionaryEntryResponse> entries, Map<String, WordCategory> categoriesByNormalizedLabel
    ) {
    }
}
