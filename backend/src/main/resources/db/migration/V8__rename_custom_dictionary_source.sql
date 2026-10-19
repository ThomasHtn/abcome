-- Words added on top of the IFDC lose the app's display name: only the domain and titles keep it.
ALTER TABLE dictionary_entry DROP CONSTRAINT ck_dictionary_entry_source;
UPDATE dictionary_entry SET source = 'custom' WHERE source = 'abcome';
ALTER TABLE dictionary_entry ADD CONSTRAINT ck_dictionary_entry_source CHECK (source IN ('ifdc', 'custom'));
