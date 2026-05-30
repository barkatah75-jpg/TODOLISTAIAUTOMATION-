-- ============================================================
-- Migration 004: Notification Preferences & Additional Indexes
-- ============================================================

-- ── NOTIFICATION PREFERENCES ───────────────────────────────

CREATE TABLE notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_alerts         BOOLEAN DEFAULT true,
  task_reminders        BOOLEAN DEFAULT true,
  mood_reminders        BOOLEAN DEFAULT true,
  weekly_report         BOOLEAN DEFAULT true,
  level_up              BOOLEAN DEFAULT true,
  reward_unlocked       BOOLEAN DEFAULT true,
  school_assignments    BOOLEAN DEFAULT true,
  reminder_time         TIME DEFAULT '17:00',  -- 5 PM daily reminder
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_prefs_own" ON notification_preferences FOR ALL USING (user_id = auth.uid());

-- Auto-create notification preferences on user signup
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
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.rewards (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, ai_enabled)
  VALUES (NEW.id, 'free', false) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.learning_profiles (user_id)
  VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── ANALYTICS EVENTS TABLE ──────────────────────────────────

CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_name  TEXT NOT NULL,
  properties  JSONB DEFAULT '{}',
  session_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_event_name ON analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at DESC);

-- Only admin role can read all analytics
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_own" ON analytics_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "analytics_admin" ON analytics_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── ADDITIONAL PERFORMANCE INDEXES ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_mood_user_week ON mood_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user_status ON ai_stories(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_user_date ON focus_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON parent_alerts(parent_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_user ON learning_profiles(user_id);

-- ── FUNCTION: Get unread alert count for parent ─────────────

CREATE OR REPLACE FUNCTION public.get_unread_alert_count(p_parent_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM parent_alerts
  WHERE parent_id = p_parent_id AND read = false;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_alert_count TO authenticated;

-- ── FUNCTION: Award XP on focus session complete ────────────

CREATE OR REPLACE FUNCTION public.complete_focus_session(
  p_session_id UUID,
  p_user_id UUID,
  p_cycles INT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_xp_bonus INT;
  v_xp_result JSONB;
BEGIN
  v_xp_bonus := p_cycles * 25;

  UPDATE focus_sessions SET
    status = 'completed',
    completed_cycles = p_cycles,
    xp_bonus = v_xp_bonus,
    completed_at = NOW()
  WHERE id = p_session_id AND user_id = p_user_id;

  SELECT award_xp(
    p_user_id,
    v_xp_bonus,
    'Focus session: ' || p_cycles || ' cycle(s)'
  ) INTO v_xp_result;

  RETURN jsonb_build_object(
    'xp_bonus', v_xp_bonus,
    'cycles', p_cycles,
    'level_result', v_xp_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_focus_session TO authenticated;
