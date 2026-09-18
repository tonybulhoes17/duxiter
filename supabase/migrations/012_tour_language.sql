-- Tracks the language of a tour's actual audio narration/content, independent
-- from title/description (which are already per-locale JSONB translations
-- used only for UI display). All existing tours are Portuguese narration,
-- hence the backfilled default.
alter table tours add column if not exists language text not null default 'pt';

comment on column tours.language is
  'Language of the tour''s audio narration (pt, en, es, hi, ...). Not the same as title/description JSONB, which are UI-display translations only.';
