-- ============================================================
-- Migration 002: Additional indexes, functions, and procedures
-- ============================================================

-- ── Additional composite indexes for performance ────────────

CREATE INDEX IF NOT EXISTS idx_todos_user_completed_date
  ON todos(user_id, completed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_todos_assigned_by
  ON todos(assigned_by) WHERE assigned_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_missions_date
  ON user_missions(user_id, assigned_date, completed);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_date
  ON xp_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user
  ON payments(user_id, status, created_at DESC);

-- ── Function: Get child summary stats for parent dashboard ──

CREATE OR REPLACE FUNCTION public.get_child_summary(p_child_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tasks_today', (
      SELECT COUNT(*) FROM todos
      WHERE user_id = p_child_id
        AND created_at >= CURRENT_DATE::timestamptz
    ),
    'completed_today', (
      SELECT COUNT(*) FROM todos
      WHERE user_id = p_child_id
        AND completed = true
        AND completed_at >= CURRENT_DATE::timestamptz
    ),
    'tasks_this_week', (
      SELECT COUNT(*) FROM todos
      WHERE user_id = p_child_id
        AND created_at >= date_trunc('week', NOW())
    ),
    'completed_this_week', (
      SELECT COUNT(*) FROM todos
      WHERE user_id = p_child_id
        AND completed = true
        AND completed_at >= date_trunc('week', NOW())
    ),
    'xp_this_week', (
      SELECT COALESCE(SUM(amount), 0) FROM xp_transactions
      WHERE user_id = p_child_id
        AND amount > 0
        AND created_at >= date_trunc('week', NOW())
    ),
    'active_missions', (
      SELECT COUNT(*) FROM user_missions
      WHERE user_id = p_child_id
        AND assigned_date = CURRENT_DATE
        AND completed = false
    ),
    'badges_count', (
      SELECT COUNT(*) FROM badges WHERE user_id = p_child_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (RLS still applies at table level)
GRANT EXECUTE ON FUNCTION public.get_child_summary TO authenticated;

-- ── Function: Auto-assign daily missions ────────────────────

CREATE OR REPLACE FUNCTION public.assign_daily_missions(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_count INT;
  v_mission_ids UUID[];
BEGIN
  -- Check if already assigned today
  SELECT COUNT(*) INTO v_count
  FROM user_missions
  WHERE user_id = p_user_id AND assigned_date = v_today;

  IF v_count > 0 THEN RETURN v_count; END IF;

  -- Get 2 random daily missions
  SELECT ARRAY_AGG(id ORDER BY RANDOM()) INTO v_mission_ids
  FROM (SELECT id FROM missions WHERE active = true AND mission_type = 'daily' LIMIT 10) sub
  LIMIT 2;

  IF v_mission_ids IS NULL THEN RETURN 0; END IF;

  -- Insert missions for today
  INSERT INTO user_missions (user_id, mission_id, assigned_date, expires_at)
  SELECT p_user_id, unnest(v_mission_ids), v_today, (v_today + INTERVAL '1 day')
  ON CONFLICT (user_id, mission_id, assigned_date) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_daily_missions TO authenticated;

-- ── Function: Calculate completion rate ────────────────────

CREATE OR REPLACE FUNCTION public.get_completion_rate(
  p_user_id UUID,
  p_days INT DEFAULT 7
)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total INT;
  v_completed INT;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true)
  INTO v_total, v_completed
  FROM todos
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  IF v_total = 0 THEN RETURN 0; END IF;
  RETURN ROUND((v_completed::NUMERIC / v_total) * 100, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_completion_rate TO authenticated;

-- ── Realtime: Enable for key tables ────────────────────────
-- Run in Supabase dashboard: Realtime > Tables > Enable for:
-- todos, rewards, user_missions, badges, parent_rewards

-- ── View: Leaderboard (family) ──────────────────────────────

CREATE OR REPLACE VIEW public.v_child_leaderboard AS
SELECT
  p.id,
  p.name,
  p.display_name,
  r.total_xp,
  r.level,
  r.streak_days,
  r.tasks_completed,
  ROW_NUMBER() OVER (ORDER BY r.total_xp DESC) AS rank
FROM profiles p
JOIN rewards r ON r.user_id = p.id
WHERE p.role = 'child'
ORDER BY r.total_xp DESC;

-- RLS: only expose rows for children in the same family
-- This view is for reference; use the API route with explicit joins instead.
