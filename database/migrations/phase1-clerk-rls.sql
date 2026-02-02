-- Phase 1: Clerk identity and RLS
-- Run this in Supabase SQL Editor if you already have the Moss schema (Supabase Auth).
-- Backup first. After this, users.id will have no default; new rows get id = Clerk user id from the app.
-- RLS no longer uses auth.uid(); API will use service role and enforce "current user" in code.

-- 1. Remove default on users.id (app will set id = Clerk user id)
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- 2. Drop auth.uid()-based policies
DROP POLICY IF EXISTS "Users can update own row" ON users;
DROP POLICY IF EXISTS "Users can view their saves" ON saves;
DROP POLICY IF EXISTS "Users can insert their saves" ON saves;
DROP POLICY IF EXISTS "Users can delete their saves" ON saves;
