-- First-touch UTM attribution captured client-side at landing and carried
-- through to checkout, so paid-traffic tests (e.g. geo-targeted campaigns)
-- can be tied to real purchases in /admin/finances, not just ad-platform clicks.
alter table purchases add column if not exists utm_source text;
alter table purchases add column if not exists utm_medium text;
alter table purchases add column if not exists utm_campaign text;
