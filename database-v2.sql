-- SalonAI Database Schema v2
-- Run this in Supabase SQL Editor

-- Salons table
CREATE TABLE IF NOT EXISTS salons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  google_maps_url text DEFAULT '',
  services jsonb DEFAULT '[]',
  masters jsonb DEFAULT '[]',
  working_hours jsonb DEFAULT '{"start":"09:00","end":"19:00"}',
  accent_color text DEFAULT '#C8A96E',
  created_at timestamp DEFAULT now()
);

-- Add salon_id to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS salon_id uuid REFERENCES salons(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed';

-- Loyalty program
CREATE TABLE IF NOT EXISTS loyalty (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid REFERENCES salons(id),
  client_phone text NOT NULL,
  client_name text DEFAULT '',
  visits integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  last_visit date,
  created_at timestamp DEFAULT now(),
  UNIQUE(salon_id, client_phone)
);

-- Review requests
CREATE TABLE IF NOT EXISTS review_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid REFERENCES salons(id),
  appointment_id uuid REFERENCES appointments(id),
  client_name text NOT NULL,
  client_phone text NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamp,
  created_at timestamp DEFAULT now()
);