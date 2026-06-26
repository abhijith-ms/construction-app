-- Migration 001: Profiles & shared utilities
-- Creates the profiles table (1:1 with auth.users) and a reusable trigger
-- function for auto-updating updated_at columns across all tables.

---------------------------------------------------------------------------
-- Extensions
---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------------------------------------------------------
-- Reusable trigger function: auto-set updated_at on row update
---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---------------------------------------------------------------------------
-- profiles
---------------------------------------------------------------------------
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  phone      VARCHAR(20),
  role       TEXT        NOT NULL
             CHECK (role IN ('admin', 'office_manager', 'supervisor')),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  profiles          IS 'User profiles, 1:1 with auth.users. Stores role and identity info.';
COMMENT ON COLUMN profiles.role     IS 'App permission role: admin, office_manager, or supervisor.';
COMMENT ON COLUMN profiles.phone    IS 'Contact phone number.';
COMMENT ON COLUMN profiles.is_active IS 'Soft-disable flag. Inactive users cannot access the app.';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
