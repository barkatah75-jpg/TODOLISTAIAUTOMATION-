-- ============================================================
-- Migration 003: Advanced Features Schema
-- AIVANA Kids OS — Adaptive Learning, School, Mood, Stories
-- ============================================================

-- ── ENUMS ──────────────────────────────────────────────────

CREATE TYPE mood_type AS ENUM ('great', 'good', 'okay', 'tired', 'sad', 'stressed');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard', 'adaptive');
CREATE TYPE school_role AS ENUM ('teacher', 'student', 'admin');
CREATE TYPE story_status AS ENUM ('generating', 'ready', 'failed');
CREATE TYPE focus_session_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE alert_type AS ENUM ('mood_low', 'streak_break', 'screen_time', 'no_activity', 'level_up');

-- ── MOOD TRACKER ────────────────────────────────────────────

CREATE TABLE mood_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood          mood_type NOT NULL,
  note          TEXT CHECK (char_length(note) <= 500),
  energy_level  INT CHECK (energy_level BETWEEN 1 AND 5),
  tasks_before  INT DEFAULT 0,   -- tasks completed before this check-in
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date          DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE UNIQUE INDEX idx_mood_entries_user_date
  ON mood_entries(user_id, date);

CREATE INDEX idx_mood_entries_user_recent
  ON mood_entries(user_id, checked_in_at DESC);

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mood_own" ON mood_entries FOR ALL USING (user_id = auth.uid());
CREATE POLICY "mood_parent_read" ON mood_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM family_links
    WHERE parent_id = auth.uid() AND child_id = mood_entries.user_id
  ));

-- ── SCREEN TIME ─────────────────────────────────────────────

CREATE TABLE screen_time_limits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  daily_limit_mins  INT NOT NULL DEFAULT 120 CHECK (daily_limit_mins BETWEEN 15 AND 480),
  bedtime_start     TIME,         -- e.g., '21:00'
  bedtime_end       TIME,         -- e.g., '07:00'
  weekend_extra_mins INT DEFAULT 60,
  focus_mode_enabled BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

CREATE TABLE screen_time_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  duration_mins INT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_screen_time_user_date ON screen_time_sessions(user_id, date);

ALTER TABLE screen_time_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "screen_limits_parent" ON screen_time_limits FOR ALL USING (parent_id = auth.uid());
CREATE POLICY "screen_limits_child_read" ON screen_time_limits FOR SELECT USING (child_id = auth.uid());
CREATE POLICY "screen_sessions_own" ON screen_time_sessions FOR ALL USING (user_id = auth.uid());

-- ── FOCUS SESSIONS (Pomodoro) ───────────────────────────────

CREATE TABLE focus_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  todo_id       UUID REFERENCES todos(id) ON DELETE SET NULL,
  subject       TEXT,
  duration_mins INT NOT NULL DEFAULT 25,
  break_mins    INT NOT NULL DEFAULT 5,
  status        focus_session_status NOT NULL DEFAULT 'active',
  completed_cycles INT NOT NULL DEFAULT 0,
  xp_bonus      INT DEFAULT 0,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_focus_sessions_user ON focus_sessions(user_id, started_at DESC);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "focus_own" ON focus_sessions FOR ALL USING (user_id = auth.uid());

-- ── ADAPTIVE LEARNING ENGINE ─────────────────────────────────

CREATE TABLE learning_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Subject performance scores (0-100)
  math_score      DECIMAL(5,2) DEFAULT 50,
  science_score   DECIMAL(5,2) DEFAULT 50,
  reading_score   DECIMAL(5,2) DEFAULT 50,
  writing_score   DECIMAL(5,2) DEFAULT 50,
  -- Behavioral metrics
  avg_completion_time_mins DECIMAL(6,2),
  preferred_time_of_day    TEXT,  -- 'morning' | 'afternoon' | 'evening'
  best_category            TEXT,  -- category where completion rate is highest
  struggle_category        TEXT,  -- category where completion rate is lowest
  -- Difficulty preferences
  current_difficulty       difficulty_level DEFAULT 'medium',
  consecutive_easy_wins    INT DEFAULT 0,
  consecutive_failures     INT DEFAULT 0,
  -- Engagement
  last_analyzed_at         TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE task_performance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  todo_id         UUID REFERENCES todos(id) ON DELETE SET NULL,
  category        TEXT NOT NULL,
  difficulty      difficulty_level NOT NULL DEFAULT 'medium',
  completed       BOOLEAN NOT NULL,
  time_taken_mins DECIMAL(6,2),
  attempts        INT DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_perf_user ON task_performance(user_id, created_at DESC);
CREATE INDEX idx_task_perf_category ON task_performance(user_id, category, completed);

ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_own" ON learning_profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "learning_parent_read" ON learning_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM family_links WHERE parent_id = auth.uid() AND child_id = learning_profiles.user_id));
CREATE POLICY "task_perf_own" ON task_performance FOR ALL USING (user_id = auth.uid());

-- ── AI STORIES (Reward Generator) ───────────────────────────

CREATE TABLE ai_stories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  hero_name     TEXT NOT NULL,   -- child's display name
  achievement   TEXT NOT NULL,   -- what they accomplished
  genre         TEXT DEFAULT 'adventure',
  word_count    INT,
  status        story_status DEFAULT 'ready',
  milestone_xp  INT,            -- XP at time of story generation
  milestone_level INT,
  cover_emoji   TEXT DEFAULT '📚',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stories_user ON ai_stories(user_id, created_at DESC);

ALTER TABLE ai_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_own" ON ai_stories FOR ALL USING (user_id = auth.uid());
CREATE POLICY "stories_parent_read" ON ai_stories FOR SELECT
  USING (EXISTS (SELECT 1 FROM family_links WHERE parent_id = auth.uid() AND child_id = ai_stories.user_id));

-- ── SCHOOL / TEACHER INTEGRATION ────────────────────────────

CREATE TABLE schools (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,  -- join code e.g. 'SCHOOL-X4K9'
  city            TEXT,
  country         TEXT DEFAULT 'IN',
  subscription_plan TEXT DEFAULT 'school',
  max_students    INT DEFAULT 30,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE school_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        school_role NOT NULL DEFAULT 'student',
  class_name  TEXT,   -- e.g., '5A', 'Grade 4'
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id)
);

CREATE TABLE classroom_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  subject         TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  due_date        TIMESTAMPTZ,
  points          INT DEFAULT 20,
  emoji           TEXT DEFAULT '📚',
  active          BOOLEAN DEFAULT true,
  total_assigned  INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignment_completions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id   UUID NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  todo_id         UUID REFERENCES todos(id) ON DELETE SET NULL,
  completed       BOOLEAN DEFAULT false,
  completed_at    TIMESTAMPTZ,
  grade           TEXT,  -- 'A', 'B+', etc. (optional)
  teacher_note    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_school_members_school ON school_members(school_id, role);
CREATE INDEX idx_school_members_user ON school_members(user_id);
CREATE INDEX idx_assignments_school ON classroom_assignments(school_id, class_name, active);
CREATE INDEX idx_completions_assignment ON assignment_completions(assignment_id, completed);
CREATE INDEX idx_completions_student ON assignment_completions(student_id, completed_at DESC);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schools_member_read" ON schools FOR SELECT
  USING (EXISTS (SELECT 1 FROM school_members WHERE school_id = schools.id AND user_id = auth.uid()));
CREATE POLICY "school_members_own" ON school_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "school_members_teacher" ON school_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM school_members sm WHERE sm.school_id = school_members.school_id AND sm.user_id = auth.uid() AND sm.role IN ('teacher', 'admin')));
CREATE POLICY "assignments_teacher" ON classroom_assignments FOR ALL
  USING (teacher_id = auth.uid());
CREATE POLICY "assignments_student_read" ON classroom_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM school_members WHERE school_id = classroom_assignments.school_id AND user_id = auth.uid() AND class_name = classroom_assignments.class_name));
CREATE POLICY "completions_own" ON assignment_completions FOR ALL USING (student_id = auth.uid());
CREATE POLICY "completions_teacher" ON assignment_completions FOR ALL
  USING (EXISTS (SELECT 1 FROM classroom_assignments ca WHERE ca.id = assignment_completions.assignment_id AND ca.teacher_id = auth.uid()));

-- ── PARENT ALERTS ────────────────────────────────────────────

CREATE TABLE parent_alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type  alert_type NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_parent ON parent_alerts(parent_id, read, created_at DESC);

ALTER TABLE parent_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_parent" ON parent_alerts FOR ALL USING (parent_id = auth.uid());

-- ── FUNCTIONS ──────────────────────────────────────────────

-- Analyze child learning and update profile
CREATE OR REPLACE FUNCTION public.analyze_learning_profile(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_tasks      INT;
  v_completed_tasks  INT;
  v_rate             DECIMAL;
  v_best_cat         TEXT;
  v_worst_cat        TEXT;
  v_easy_wins        INT;
  v_failures         INT;
  v_new_difficulty   difficulty_level;
BEGIN
  -- Get overall completion rate last 7 days
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed)
  INTO v_total_tasks, v_completed_tasks
  FROM todos
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '7 days';

  IF v_total_tasks = 0 THEN RETURN; END IF;
  v_rate := v_completed_tasks::DECIMAL / v_total_tasks;

  -- Find best performing category
  SELECT category INTO v_best_cat
  FROM todos
  WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY category
  ORDER BY COUNT(*) FILTER (WHERE completed)::DECIMAL / NULLIF(COUNT(*), 0) DESC
  LIMIT 1;

  -- Find struggle category
  SELECT category INTO v_worst_cat
  FROM todos
  WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY category
  HAVING COUNT(*) >= 3
  ORDER BY COUNT(*) FILTER (WHERE completed)::DECIMAL / NULLIF(COUNT(*), 0) ASC
  LIMIT 1;

  -- Check consecutive performance for difficulty adjustment
  SELECT
    COUNT(*) FILTER (WHERE completed AND points <= 15),
    COUNT(*) FILTER (WHERE NOT completed)
  INTO v_easy_wins, v_failures
  FROM todos
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '3 days';

  -- Determine new difficulty
  IF v_easy_wins >= 5 THEN
    v_new_difficulty := 'hard';
  ELSIF v_failures >= 3 THEN
    v_new_difficulty := 'easy';
  ELSIF v_rate > 0.8 THEN
    v_new_difficulty := 'medium';
  ELSE
    v_new_difficulty := 'medium';
  END IF;

  -- Upsert learning profile
  INSERT INTO learning_profiles (
    user_id, best_category, struggle_category,
    current_difficulty, consecutive_easy_wins, consecutive_failures,
    last_analyzed_at, updated_at
  ) VALUES (
    p_user_id, v_best_cat, v_worst_cat,
    v_new_difficulty, v_easy_wins, v_failures,
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    best_category = EXCLUDED.best_category,
    struggle_category = EXCLUDED.struggle_category,
    current_difficulty = EXCLUDED.current_difficulty,
    consecutive_easy_wins = EXCLUDED.consecutive_easy_wins,
    consecutive_failures = EXCLUDED.consecutive_failures,
    last_analyzed_at = NOW(),
    updated_at = NOW();
END;
$$;

-- Create parent alert
CREATE OR REPLACE FUNCTION public.create_parent_alert(
  p_child_id UUID,
  p_alert_type alert_type,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO parent_alerts (parent_id, child_id, alert_type, message, data)
  SELECT fl.parent_id, p_child_id, p_alert_type, p_message, p_data
  FROM family_links fl
  WHERE fl.child_id = p_child_id;
END;
$$;

-- Check mood pattern and alert parents
CREATE OR REPLACE FUNCTION public.check_mood_alerts(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sad_days INT;
BEGIN
  -- Count 'sad' or 'stressed' moods in last 3 days
  SELECT COUNT(*) INTO v_sad_days
  FROM mood_entries
  WHERE user_id = p_user_id
    AND checked_in_at > NOW() - INTERVAL '3 days'
    AND mood IN ('sad', 'stressed');

  IF v_sad_days >= 2 THEN
    PERFORM create_parent_alert(
      p_user_id,
      'mood_low',
      'Your child has reported feeling sad or stressed for ' || v_sad_days || ' days. Consider checking in with them.',
      jsonb_build_object('sad_days', v_sad_days, 'period', '3 days')
    );
  END IF;
END;
$$;
