-- Migration 013: HubSpot List Origin
-- Stores the originating HubSpot list ID and object type on prospect_lists
-- so "Refresh from HubSpot" can re-read segment members in addition to the
-- leadpulse_list_name property filter.

ALTER TABLE prospect_lists
  ADD COLUMN IF NOT EXISTS hubspot_list_id          text,
  ADD COLUMN IF NOT EXISTS hubspot_list_object_type_id text;

-- hubspot_list_id              — HubSpot list/segment ID (v1 numeric or v3 UUID)
-- hubspot_list_object_type_id  — '0-1' for contact lists, '0-2' for company lists
-- NULL on lists created via CSV upload (no originating HubSpot segment).
