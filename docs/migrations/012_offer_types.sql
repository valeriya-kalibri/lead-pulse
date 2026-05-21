-- Migration 012: Offer Types
-- Adds offer_type to prospect_lists to support Lead Capture and Business Analytics pitches
-- Run this on existing databases before deploying the offer types feature

ALTER TABLE prospect_lists
ADD COLUMN IF NOT EXISTS offer_type text NOT NULL DEFAULT 'lead_capture';

-- All existing lists default to lead_capture — backward compatible, no data loss
-- Allowed values: 'lead_capture' | 'business_analytics'
