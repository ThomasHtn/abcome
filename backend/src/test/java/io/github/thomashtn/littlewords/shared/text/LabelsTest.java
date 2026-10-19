package io.github.thomashtn.littlewords.shared.text;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Specifies how labels are cleaned and compared.
 */
class LabelsTest {

    @Test
    @DisplayName("Trims a label and collapses its inner spaces, keeping case and accents")
    void cleansLabel() {
        assertThat(Labels.clean("  Au   revoir  ")).isEqualTo("Au revoir");
        assertThat(Labels.clean("Bébé")).isEqualTo("Bébé");
    }

    @Test
    @DisplayName("Gives the same key whatever the case and accents")
    void ignoresCaseAndAccents() {
        assertThat(Labels.normalize(" Bébé ")).isEqualTo("bebe");
        assertThat(Labels.normalize("GÂTEAU")).isEqualTo(Labels.normalize("gateau"));
        assertThat(Labels.normalize("maïs")).isEqualTo("mais");
    }

    @Test
    @DisplayName("Spells out ligatures and straightens apostrophes")
    void flattensLigaturesAndApostrophes() {
        assertThat(Labels.normalize("sœur")).isEqualTo("soeur");
        assertThat(Labels.normalize("s’il te plaît")).isEqualTo("s'il te plait");
    }
}
