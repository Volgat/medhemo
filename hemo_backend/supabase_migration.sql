-- ============================================================
-- Hemo AI — Migration Supabase PostgreSQL
-- À exécuter dans Supabase SQL Editor :
-- https://supabase.com/dashboard/project/drvupgxmheaevnulguih/sql
-- ============================================================

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id                     SERIAL PRIMARY KEY,
    username               VARCHAR UNIQUE NOT NULL,
    email                  VARCHAR UNIQUE NOT NULL,
    hashed_password        VARCHAR NOT NULL,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stripe_customer_id     VARCHAR UNIQUE,
    stripe_subscription_id VARCHAR,
    subscription_status    VARCHAR DEFAULT 'inactive',
    last_seen              TIMESTAMP WITH TIME ZONE,
    total_messages         INTEGER DEFAULT 0,
    country                VARCHAR(2),
    plan                   VARCHAR DEFAULT 'free',
    reset_code             VARCHAR
);

-- Migration for existing databases
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR;

-- Table des logs de messages (analytics)
CREATE TABLE IF NOT EXISTS message_logs (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modality   VARCHAR DEFAULT 'text',
    country    VARCHAR(2)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_users_username     ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at   ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_seen    ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_users_country      ON users(country);
CREATE INDEX IF NOT EXISTS idx_logs_created_at    ON message_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_username      ON message_logs(username);

-- ============================================================
-- Row Level Security (RLS) — Désactivé pour les appels serveur
-- Le service role key bypasse automatiquement le RLS.
-- ============================================================
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Politique : seul le service role peut tout faire
-- (les appels depuis Next.js utilisent le service role key)
CREATE POLICY IF NOT EXISTS "service_role_all_users" ON users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "service_role_all_logs" ON message_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Vérification
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'message_logs');
