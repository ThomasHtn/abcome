-- A sound trimmed in the browser is re-encoded as WAV, next to the webm and mp4 the browsers record.
ALTER TABLE recording DROP CONSTRAINT ck_recording_mime_type;
ALTER TABLE recording ADD CONSTRAINT ck_recording_mime_type
  CHECK (mime_type IN ('audio/webm', 'audio/mp4', 'audio/wav'));
