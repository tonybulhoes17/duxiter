-- AI itineraries can now target any place on earth, not just registered cities.
-- city_id / city_name stay for the curated path; free-form requests store the
-- user-supplied place here (also useful later: "most requested places" -> new
-- curated cities).
alter table ai_itineraries
  add column if not exists destination jsonb;

-- destination shape (free-form only; null for curated itineraries):
--   { "query": "Kyoto, Japan", "area": "Gion", "lat": 35.0, "lng": 135.7,
--     "label": "Kyoto, Japan" }
