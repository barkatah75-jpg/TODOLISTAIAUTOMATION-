-- ============================================================
-- AIVANA Kids OS — Complete Database Schema
-- Run: supabase db push OR paste in Supabase SQL editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ──────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('child', 'parent', 'admin');
CREATE TYPE task_category AS ENUM (
  'homework', 'chores', 'reading', 'exercise',
  'creative', 'social', 'personal', 'custom'
);
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'family', 'school');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');
CREATE TYPE mission_type AS ENUM ('daily', 'weekly', 'special');
CREATE TYPE badge_type AS ENUM (
  'first_task', 'streak_3', 'streak_7', 'streak_30',
  'level_5', 'level_10', 'perfect_week', 'early_bird',
  'homework_hero', 'chore_champion', 'reader', 'artist',
  'ai_explorer', 'social_star', 'custom'
);
CREATE TYPE notification_type AS ENUM ('task_reminder', 'streak_alert', 'reward', 'message', 'system');
CREATE TYPE file_type AS ENUM ('pdf', 'image', 'drawing');
CREATE TYPE payment_provider AS ENUM ('razorpay', 'paypal', 'stripe');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ── PROFILES (extends Supabase auth.users) ─────────────────

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  role         user_role NOT NULL DEFAULT 'child',
  date_of_birth DATE,
  language     TEXT NOT NULL DEFAULT 'en',
  timezone     TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  theme        TEXT NOT NULL DEFAULT 'light',
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  onboarded    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PARENT-CHILD RELATIONSHIPS ─────────────────────────────

CREATE TABLE family_links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id),
  CHECK (parent_id <> child_id)
);

-- ── SUBSCRIPTIONS ──────────────────────────────────────────

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan                  subscription_plan NOT NULL DEFAULT 'free',
  status                subscription_status NOT NULL DEFAULT 'active',
  provider              payment_provider,
  provider_subscription_id TEXT,
  provider_customer_id  TEXT,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at             TIMESTAMPTZ,
  max_children          INT NOT NULL DEFAULT 1,
  ai_enabled            BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── TODOS ──────────────────────────────────────────────────

CREATE TABLE todos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  text            TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  description     TEXT CHECK (char_length(description) <= 2000),
  category        task_category NOT NULL DEFAULT 'custom',
  emoji           TEXT NOT NULL DEFAULT '✅',
  completed       BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  points          INT NOT NULL DEFAULT 10 CHECK (points >= 0 AND points <= 1000),
  due_date        TIMESTAMPTZ,
  priority        INT NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  recurring       TEXT,           -- cron-like: 'daily', 'weekly', 'weekdays'
  parent_approved BOOLEAN,        -- null = not required, true/false = approved/rejected
  ai_suggested    BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── REWARDS / XP SYSTEM ────────────────────────────────────

CREATE TABLE rewards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_xp    INT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level       INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  streak_days INT NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  tasks_completed INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type  badge_type NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT NOT NULL DEFAULT '🏆',
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

CREATE TABLE xp_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      INT NOT NULL,
  reason      TEXT NOT NULL,
  todo_id     UUID REFERENCES todos(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── MISSIONS (Daily/Weekly Challenges) ─────────────────────

CREATE TABLE missions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  mission_type  mission_type NOT NULL DEFAULT 'daily',
  target_count  INT NOT NULL DEFAULT 1,
  xp_reward     INT NOT NULL DEFAULT 50,
  category      task_category,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_missions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id   UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  progress     INT NOT NULL DEFAULT 0,
  completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at   TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, mission_id, assigned_date)
);

-- ── DRAWINGS ───────────────────────────────────────────────

CREATE TABLE drawings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'My Drawing',
  image_url   TEXT NOT NULL,
  thumbnail_url TEXT,
  canvas_data JSONB,         -- stores brush strokes for replay
  width       INT DEFAULT 800,
  height      INT DEFAULT 600,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── FILES (PDF + Images) ───────────────────────────────────

CREATE TABLE files (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  original_url    TEXT NOT NULL,
  processed_url   TEXT,
  file_type       file_type NOT NULL,
  original_size   BIGINT,
  processed_size  BIGINT,
  ocr_text        TEXT,
  processing_status TEXT DEFAULT 'pending', -- pending/processing/done/error
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── AI CONVERSATIONS ───────────────────────────────────────

CREATE TABLE ai_conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'New Conversation',
  messages   JSONB NOT NULL DEFAULT '[]',
  subject    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PARENT-DEFINED REWARDS ─────────────────────────────────

CREATE TABLE parent_rewards (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  xp_cost      INT NOT NULL CHECK (xp_cost > 0),
  icon         TEXT NOT NULL DEFAULT '🎁',
  redeemed     BOOLEAN NOT NULL DEFAULT false,
  redeemed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PUSH NOTIFICATION SUBSCRIPTIONS ───────────────────────

CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PAYMENT HISTORY ────────────────────────────────────────

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider            payment_provider NOT NULL,
  provider_payment_id TEXT NOT NULL,
  provider_order_id   TEXT,
  amount              DECIMAL(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  plan                subscription_plan NOT NULL,
  status              payment_status NOT NULL DEFAULT 'pending',
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── INDEXES ────────────────────────────────────────────────

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_completed ON todos(user_id, completed);
CREATE INDEX idx_todos_due_date ON todos(user_id, due_date);
CREATE INDEX idx_todos_category ON todos(user_id, category);
CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_badges_user_id ON badges(user_id);
CREATE INDEX idx_user_missions_user_id ON user_missions(user_id, assigned_date);
CREATE INDEX idx_family_links_parent ON family_links(parent_id);
CREATE INDEX idx_family_links_child ON family_links(child_id);
CREATE INDEX idx_drawings_user_id ON drawings(user_id);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own profile; parents see linked children
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_parent_read" ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_links
    WHERE parent_id = auth.uid() AND child_id = profiles.id
  ));

-- Family links: parents manage their links
CREATE POLICY "family_links_parent" ON family_links FOR ALL USING (parent_id = auth.uid());
CREATE POLICY "family_links_child_read" ON family_links FOR SELECT USING (child_id = auth.uid());

-- Todos: own todos + parent can manage child todos
CREATE POLICY "todos_own" ON todos FOR ALL USING (user_id = auth.uid());
CREATE POLICY "todos_parent" ON todos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM family_links
    WHERE parent_id = auth.uid() AND child_id = todos.user_id
  ));

-- Rewards: own only + parent read
CREATE POLICY "rewards_own" ON rewards FOR ALL USING (user_id = auth.uid());
CREATE POLICY "rewards_parent_read" ON rewards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_links
    WHERE parent_id = auth.uid() AND child_id = rewards.user_id
  ));

-- XP transactions: own only
CREATE POLICY "xp_own" ON xp_transactions FOR ALL USING (user_id = auth.uid());

-- Badges: own only + parent read
CREATE POLICY "badges_own" ON badges FOR ALL USING (user_id = auth.uid());
CREATE POLICY "badges_parent_read" ON badges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_links
    WHERE parent_id = auth.uid() AND child_id = badges.user_id
  ));

-- Missions: everyone can read active missions
CREATE POLICY "missions_read" ON missions FOR SELECT USING (active = true);
CREATE POLICY "user_missions_own" ON user_missions FOR ALL USING (user_id = auth.uid());

-- Drawings: own only
CREATE POLICY "drawings_own" ON drawings FOR ALL USING (user_id = auth.uid());

-- Files: own only
CREATE POLICY "files_own" ON files FOR ALL USING (user_id = auth.uid());

-- AI conversations: own only
CREATE POLICY "ai_conv_own" ON ai_conversations FOR ALL USING (user_id = auth.uid());

-- Parent rewards: parent manages, child reads own
CREATE POLICY "parent_rewards_parent" ON parent_rewards FOR ALL USING (parent_id = auth.uid());
CREATE POLICY "parent_rewards_child" ON parent_rewards FOR SELECT USING (child_id = auth.uid());

-- Push subscriptions: own only
CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL USING (user_id = auth.uid());

-- Payments: own only
CREATE POLICY "payments_own" ON payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "subscriptions_own" ON subscriptions FOR SELECT USING (user_id = auth.uid());

-- ── FUNCTIONS ──────────────────────────────────────────────

-- Auto-create profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_role_val user_role;
BEGIN
  user_role_val := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'child'::user_role
  );

  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role_val
  );

  INSERT INTO public.rewards (user_id) VALUES (NEW.id);

  INSERT INTO public.subscriptions (user_id, plan, ai_enabled)
  VALUES (NEW.id, 'free', false);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Award XP and update level
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_todo_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_xp INT;
  v_new_level INT;
  v_old_level INT;
  v_leveled_up BOOLEAN := false;
BEGIN
  INSERT INTO xp_transactions (user_id, amount, reason, todo_id)
  VALUES (p_user_id, p_amount, p_reason, p_todo_id);

  UPDATE rewards
  SET total_xp = total_xp + p_amount,
      tasks_completed = CASE WHEN p_reason LIKE '%task%' THEN tasks_completed + 1 ELSE tasks_completed END,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING total_xp, level INTO v_new_xp, v_old_level;

  -- Level formula: level = floor(sqrt(total_xp / 100)) + 1
  v_new_level := FLOOR(SQRT(v_new_xp::FLOAT / 100))::INT + 1;

  IF v_new_level > v_old_level THEN
    UPDATE rewards SET level = v_new_level, updated_at = now() WHERE user_id = p_user_id;
    v_leveled_up := true;
  END IF;

  RETURN jsonb_build_object(
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up
  );
END;
$$;

-- Update streak on task completion
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_date DATE;
  v_streak INT;
BEGIN
  SELECT last_active_date, streak_days INTO v_last_date, v_streak
  FROM rewards WHERE user_id = p_user_id;

  IF v_last_date = CURRENT_DATE THEN
    RETURN v_streak;
  ELSIF v_last_date = CURRENT_DATE - 1 THEN
    UPDATE rewards
    SET streak_days = streak_days + 1,
        longest_streak = GREATEST(longest_streak, streak_days + 1),
        last_active_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING streak_days INTO v_streak;
  ELSE
    UPDATE rewards
    SET streak_days = 1,
        last_active_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING streak_days INTO v_streak;
  END IF;

  RETURN v_streak;
END;
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER todos_updated_at BEFORE UPDATE ON todos FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER drawings_updated_at BEFORE UPDATE ON drawings FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ── SEED: Default Missions ─────────────────────────────────

INSERT INTO missions (title, description, mission_type, target_count, xp_reward, category) VALUES
  ('Morning Champion', 'Complete 3 tasks before noon', 'daily', 3, 50, NULL),
  ('Homework Hero', 'Complete 2 homework tasks today', 'daily', 2, 75, 'homework'),
  ('Chore Star', 'Finish all your chore tasks today', 'daily', 3, 60, 'chores'),
  ('Reading Rockstar', 'Complete 1 reading task today', 'daily', 1, 40, 'reading'),
  ('Task Master', 'Complete 10 tasks this week', 'weekly', 10, 200, NULL),
  ('Perfect Week', 'Complete at least 1 task every day this week', 'weekly', 7, 350, NULL),
  ('Creative Week', 'Complete 5 creative tasks this week', 'weekly', 5, 180, 'creative');

-- ── STORAGE BUCKETS ────────────────────────────────────────
-- Run these in Supabase dashboard or via CLI

-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('drawings', 'drawings', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false);

-- Storage policies (run after creating buckets)
-- CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "avatars_own_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "drawings_own" ON storage.objects FOR ALL USING (bucket_id = 'drawings' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "files_own" ON storage.objects FOR ALL USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
