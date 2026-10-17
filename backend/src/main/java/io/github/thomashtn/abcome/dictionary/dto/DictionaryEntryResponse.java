package io.github.thomashtn.abcome.dictionary.dto;

import io.github.thomashtn.abcome.dictionary.entity.WordCategory;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Dictionary word offered as a suggestion.
 *
 * @param label    word with its accents
 * @param category theme of the word
 * @param frequent whether it is a shortcut on the add screen
 */
@Schema(description = "Common first word offered as a suggestion.")
public record DictionaryEntryResponse(
    @Schema(example = "lapin") String label,
    @Schema(example = "animals") WordCategory category,
    @Schema(example = "false") boolean frequent
) {
}
