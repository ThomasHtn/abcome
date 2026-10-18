-- A notebook entry is a word or a sentence; both have stages and sounds alike.
ALTER TABLE word ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'word';
ALTER TABLE word ALTER COLUMN kind DROP DEFAULT;
ALTER TABLE word ADD CONSTRAINT ck_word_kind CHECK (kind IN ('word', 'sentence'));

-- A sentence's label and spoken forms run up to 200 characters; the app keeps words at 40 and 60.
ALTER TABLE word ALTER COLUMN label TYPE VARCHAR(200);
ALTER TABLE word ALTER COLUMN normalized_label TYPE VARCHAR(400);
ALTER TABLE pronunciation ALTER COLUMN spoken TYPE VARCHAR(200);

-- Only words are unique; two sentences may mean the same thing.
ALTER TABLE word DROP CONSTRAINT uq_word_normalized_label;
CREATE UNIQUE INDEX uq_word_normalized_label ON word (normalized_label) WHERE kind = 'word';

-- Temporary link from each new entry to the sentence it comes from.
ALTER TABLE word ADD COLUMN sentence_id BIGINT;

-- Each sentence becomes a sentence entry labelled by its meaning, else by what was said; its key is only
-- lower-cased here (sentences are never compared) and recomputed by the app on a rename.
INSERT INTO word (label, normalized_label, category, kind, created_at, sentence_id)
SELECT COALESCE(meaning, spoken), lower(COALESCE(meaning, spoken)), 'custom', 'sentence', created_at, id
FROM sentence;

-- Its first stage is what was said that day, "En route" until the family says otherwise.
INSERT INTO pronunciation (word_id, spoken, status, date, created_at)
SELECT w.id, s.spoken, 'learning', s.date, s.created_at
FROM sentence s JOIN word w ON w.sentence_id = s.id;

-- The link and the old table go.
ALTER TABLE word DROP COLUMN sentence_id;
DROP TABLE sentence;
