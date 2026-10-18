-- Sounds are filed under a stage again, any number per stage; the word stays for lists and the cascade.
ALTER TABLE recording ADD COLUMN pronunciation_id BIGINT;

-- Existing sounds go to the stage current on their recording day (app.time-zone), else to the oldest stage.
UPDATE recording r SET pronunciation_id = COALESCE(
  (SELECT p.id FROM pronunciation p
    WHERE p.word_id = r.word_id AND p.date <= (r.created_at AT TIME ZONE 'Europe/Paris')::date
    ORDER BY p.date DESC, p.id DESC LIMIT 1),
  (SELECT p.id FROM pronunciation p WHERE p.word_id = r.word_id ORDER BY p.date, p.id LIMIT 1)
);

-- Every sound has a stage.
ALTER TABLE recording ALTER COLUMN pronunciation_id SET NOT NULL;

-- No cascade: a deleted stage hands its sounds to another one first; deleting the word removes both together.
ALTER TABLE recording ADD CONSTRAINT fk_recording_pronunciation
  FOREIGN KEY (pronunciation_id) REFERENCES pronunciation (id);

-- Serves the foreign key check and the move of a deleted stage's sounds.
CREATE INDEX idx_recording_pronunciation ON recording (pronunciation_id);
