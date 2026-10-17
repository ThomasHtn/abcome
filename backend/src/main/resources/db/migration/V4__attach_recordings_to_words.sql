-- Sounds now belong to the word, any number of them, instead of one per stage.
ALTER TABLE recording ADD COLUMN word_id BIGINT;

-- Existing sounds move to the word of their stage.
UPDATE recording r SET word_id = p.word_id FROM pronunciation p WHERE p.id = r.pronunciation_id;

-- Every sound has a word, and goes with it when the word is deleted.
ALTER TABLE recording ALTER COLUMN word_id SET NOT NULL;
ALTER TABLE recording ADD CONSTRAINT fk_recording_word FOREIGN KEY (word_id) REFERENCES word (id) ON DELETE CASCADE;

-- Serves the foreign key and the gallery order of a word (newest first).
CREATE INDEX idx_recording_word_created ON recording (word_id, created_at DESC, id DESC);

-- A stage no longer owns a sound: deleting a stage keeps the word's sounds.
ALTER TABLE recording DROP CONSTRAINT uq_recording_pronunciation;
ALTER TABLE recording DROP COLUMN pronunciation_id;
