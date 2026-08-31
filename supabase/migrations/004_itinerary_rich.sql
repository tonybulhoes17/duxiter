-- ============================================================
-- DUXITER — Migration 004: richer AI itineraries + start location
-- Run in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

alter table ai_itineraries
  add column if not exists start_location jsonb,   -- {"mode":"current|area|auto","lat":..,"lng":..,"area":".."}
  add column if not exists itinerary jsonb,        -- full rich object {summary, route_overview, stops, practical_tips, plan_b}
  add column if not exists start_time varchar(5),  -- "09:00"
  add column if not exists pace varchar(12);       -- "relaxed|normal|intense"

-- generated_stops (array of stops) is kept for backward compatibility and
-- is still populated alongside the new `itinerary` object.
