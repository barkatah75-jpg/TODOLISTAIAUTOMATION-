-- ============================================================
-- AIVANA Kids OS — Development Seed Data
-- Run: paste in Supabase SQL Editor after migrations
-- WARNING: Only use for development/testing!
-- ============================================================

-- Insert test parent user (requires auth.users entry first)
-- In practice, users are created via Supabase Auth
-- These are example profile updates for testing

-- Sample mission updates (additional missions beyond defaults)
INSERT INTO missions (title, description, mission_type, target_count, xp_reward, category) VALUES
  ('Speed Reader', 'Complete 3 reading tasks before sunset', 'daily', 3, 80, 'reading'),
  ('Active Athlete', 'Exercise twice today', 'daily', 2, 90, 'exercise'),
  ('Creative Soul', 'Complete 3 creative tasks this week', 'weekly', 3, 150, 'creative'),
  ('Chore Champion', 'Complete 15 chore tasks this month', 'weekly', 15, 300, 'chores'),
  ('Math Wizard', 'Solve 5 math homework tasks this week', 'weekly', 5, 200, 'homework')
ON CONFLICT DO NOTHING;

-- Verify schema is correct
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
