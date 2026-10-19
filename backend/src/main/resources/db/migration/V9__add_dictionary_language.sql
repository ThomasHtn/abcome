-- One dictionary per interface language: the existing entries are the French one.
ALTER TABLE dictionary_entry ADD COLUMN language VARCHAR(2) NOT NULL DEFAULT 'fr';
ALTER TABLE dictionary_entry ALTER COLUMN language DROP DEFAULT;
ALTER TABLE dictionary_entry ADD CONSTRAINT ck_dictionary_entry_language CHECK (language IN ('fr', 'en'));

-- The same label and the same rank may now appear once per language.
ALTER TABLE dictionary_entry DROP CONSTRAINT dictionary_entry_pkey;
ALTER TABLE dictionary_entry ADD CONSTRAINT dictionary_entry_pkey PRIMARY KEY (language, label);
ALTER TABLE dictionary_entry DROP CONSTRAINT uq_dictionary_entry_rank;
ALTER TABLE dictionary_entry ADD CONSTRAINT uq_dictionary_entry_rank UNIQUE (language, acquisition_rank);

-- English entries come from the American English CDI.
ALTER TABLE dictionary_entry DROP CONSTRAINT ck_dictionary_entry_source;
ALTER TABLE dictionary_entry ADD CONSTRAINT ck_dictionary_entry_source CHECK (source IN ('ifdc', 'cdi', 'custom'));
