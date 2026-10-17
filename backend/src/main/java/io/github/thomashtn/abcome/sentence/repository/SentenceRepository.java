package io.github.thomashtn.abcome.sentence.repository;

import io.github.thomashtn.abcome.sentence.entity.Sentence;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Access to the sentences of the notebook.
 */
public interface SentenceRepository extends JpaRepository<Sentence, Long> {

    /**
     * Lists every sentence, newest first; served by the {@code (date desc, id desc)} index.
     *
     * @return all sentences
     */
    List<Sentence> findAllByOrderByDateDescIdDesc();
}
