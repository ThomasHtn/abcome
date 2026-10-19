-- A recording may now last up to 30 seconds.
ALTER TABLE recording DROP CONSTRAINT ck_recording_duration;
ALTER TABLE recording ADD CONSTRAINT ck_recording_duration CHECK (duration_ms BETWEEN 1 AND 30000);
