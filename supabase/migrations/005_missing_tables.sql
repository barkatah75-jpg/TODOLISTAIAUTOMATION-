-- Migration 005: Ensure all advanced feature tables exist
-- Tables referenced in types/advanced.ts and API routes

-- ── Mood Entries ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood            text NOT NULL CHECK (mood IN ('great','good','okay','tired','sad','stressed')),
  note            text,
  energy_level    smallint CHECK (energy_level BETWEEN 1 AND 5),
  tasks_before    smallint NOT NULL DEFAULT 0,
  checked_in_at   timestamptz NOT NULL DEFAULT now(),
  date            date NOT NULL DEFAULT current_date
);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON public.mood_entries(user_id, date);

-- Only one mood entry per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_mood_entries_user_day ON public.mood_entries(user_id, date);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own mood" ON public.mood_entries;
CREATE POLICY "Users see own mood" ON public.mood_entries FOR ALL USING (auth.uid() = user_id);

-- Parents can view children's mood
DROP POLICY IF EXISTS "Parents see children mood" ON public.mood_entries;
CREATE POLICY "Parents see children mood" ON public.mood_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.family_links WHERE parent_id = auth.uid() AND child_id = mood_entries.user_id
  ));

-- Admins can view all mood entries
DROP POLICY IF EXISTS "Admins see all mood" ON public.mood_entries;
CREATE POLICY "Admins see all mood" ON public.mood_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ── Screen Time Limits (parent-set) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.screen_time_limits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_limit_mins    integer NOT NULL DEFAULT 120,
  bedtime_start       text,     -- e.g. "21:00"
  bedtime_end         text,     -- e.g. "07:00"
  weekend_extra_mins  integer NOT NULL DEFAULT 60,
  focus_mode_enabled  boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE public.screen_time_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents manage screen limits" ON public.screen_time_limits;
CREATE POLICY "Parents manage screen limits" ON public.screen_time_limits FOR ALL
  USING (auth.uid() = parent_id);
DROP POLICY IF EXISTS "Children see own limits" ON public.screen_time_limits;
CREATE POLICY "Children see own limits" ON public.screen_time_limits FOR SELECT
  USING (auth.uid() = child_id);


-- ── Screen Time Sessions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.screen_time_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at   timestamptz NOT NULL DEFAULT now(),
  ended_at     timestamptz,
  duration_mins integer,
  date         date NOT NULL DEFAULT current_date
);

CREATE INDEX IF NOT EXISTS idx_screen_time_user_date ON public.screen_time_sessions(user_id, date);

ALTER TABLE public.screen_time_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sessions" ON public.screen_time_sessions;
CREATE POLICY "Users manage own sessions" ON public.screen_time_sessions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Parents see children sessions" ON public.screen_time_sessions;
CREATE POLICY "Parents see children sessions" ON public.screen_time_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.family_links WHERE parent_id = auth.uid() AND child_id = screen_time_sessions.user_id
  ));


-- ── Focus Sessions (Pomodoro) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  todo_id           uuid REFERENCES public.todos(id) ON DELETE SET NULL,
  subject           text,
  duration_mins     integer NOT NULL DEFAULT 25,
  break_mins        integer NOT NULL DEFAULT 5,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  completed_cycles  integer NOT NULL DEFAULT 0,
  xp_bonus          integer NOT NULL DEFAULT 0,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON public.focus_sessions(user_id, started_at);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage focus sessions" ON public.focus_sessions;
CREATE POLICY "Users manage focus sessions" ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);


-- ── AI Stories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_stories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  content         text NOT NULL,
  hero_name       text NOT NULL,
  achievement     text NOT NULL,
  genre           text NOT NULL DEFAULT 'adventure' CHECK (genre IN ('adventure','mystery','fantasy','space','underwater','dinosaur')),
  word_count      integer,
  status          text NOT NULL DEFAULT 'ready' CHECK (status IN ('generating','ready','failed')),
  milestone_xp    integer,
  milestone_level integer,
  cover_emoji     text NOT NULL DEFAULT '📖',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_stories_user ON public.ai_stories(user_id, created_at);

ALTER TABLE public.ai_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own stories" ON public.ai_stories;
CREATE POLICY "Users manage own stories" ON public.ai_stories FOR ALL USING (auth.uid() = user_id);


-- ── Learning Profiles (adaptive engine) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_profiles (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  math_score                  numeric(4,1) NOT NULL DEFAULT 50,
  science_score               numeric(4,1) NOT NULL DEFAULT 50,
  reading_score               numeric(4,1) NOT NULL DEFAULT 50,
  writing_score               numeric(4,1) NOT NULL DEFAULT 50,
  avg_completion_time_mins    numeric(5,1),
  preferred_time_of_day       text,
  best_category               text,
  struggle_category           text,
  current_difficulty          text NOT NULL DEFAULT 'medium' CHECK (current_difficulty IN ('easy','medium','hard','adaptive')),
  consecutive_easy_wins       integer NOT NULL DEFAULT 0,
  consecutive_failures        integer NOT NULL DEFAULT 0,
  last_analyzed_at            timestamptz,
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage learning profile" ON public.learning_profiles;
CREATE POLICY "Users manage learning profile" ON public.learning_profiles FOR ALL USING (auth.uid() = user_id);


-- ── Task Performance (for adaptive engine) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.task_performance (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  todo_id           uuid REFERENCES public.todos(id) ON DELETE SET NULL,
  category          text NOT NULL,
  difficulty        text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard','adaptive')),
  completed         boolean NOT NULL DEFAULT false,
  time_taken_mins   integer,
  attempts          integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_perf_user ON public.task_performance(user_id, created_at);

ALTER TABLE public.task_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage performance" ON public.task_performance;
CREATE POLICY "Users manage performance" ON public.task_performance FOR ALL USING (auth.uid() = user_id);


-- ── Parent Alerts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parent_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type  text NOT NULL CHECK (alert_type IN ('mood_low','streak_break','screen_time','no_activity','level_up')),
  message     text NOT NULL,
  data        jsonb,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_alerts_parent ON public.parent_alerts(parent_id, created_at);

ALTER TABLE public.parent_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents see own alerts" ON public.parent_alerts;
CREATE POLICY "Parents see own alerts" ON public.parent_alerts FOR ALL USING (auth.uid() = parent_id);


-- ── Schools ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schools (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  code                text UNIQUE NOT NULL,
  city                text,
  country             text NOT NULL DEFAULT 'IN',
  subscription_plan   text NOT NULL DEFAULT 'free',
  max_students        integer NOT NULL DEFAULT 100,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members see their school" ON public.schools;
CREATE POLICY "School members see their school" ON public.schools FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.school_members WHERE school_id = schools.id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins manage schools" ON public.schools;
CREATE POLICY "Admins manage schools" ON public.schools FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- ── School Members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'student' CHECK (role IN ('teacher','student','admin')),
  class_name  text,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_school_members_school ON public.school_members(school_id, role);
CREATE INDEX IF NOT EXISTS idx_school_members_user ON public.school_members(user_id);

ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members see same school" ON public.school_members;
CREATE POLICY "Members see same school" ON public.school_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id = school_members.school_id AND sm.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users manage own membership" ON public.school_members;
CREATE POLICY "Users manage own membership" ON public.school_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── Classroom Assignments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classroom_assignments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  subject          text NOT NULL,
  class_name       text,
  due_date         timestamptz,
  points           integer NOT NULL DEFAULT 50,
  emoji            text NOT NULL DEFAULT '📚',
  active           boolean NOT NULL DEFAULT true,
  total_assigned   integer NOT NULL DEFAULT 0,
  total_completed  integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_school ON public.classroom_assignments(school_id, active);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.classroom_assignments(teacher_id);

ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers manage own assignments" ON public.classroom_assignments;
CREATE POLICY "Teachers manage own assignments" ON public.classroom_assignments FOR ALL
  USING (auth.uid() = teacher_id);
DROP POLICY IF EXISTS "Students see active assignments" ON public.classroom_assignments;
CREATE POLICY "Students see active assignments" ON public.classroom_assignments FOR SELECT
  USING (active = true AND EXISTS (
    SELECT 1 FROM public.school_members WHERE school_id = classroom_assignments.school_id AND user_id = auth.uid()
  ));


-- ── Assignment Completions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assignment_completions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   uuid NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  todo_id         uuid REFERENCES public.todos(id) ON DELETE SET NULL,
  completed       boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  grade           text,
  teacher_note    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.assignment_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students see own completions" ON public.assignment_completions;
CREATE POLICY "Students see own completions" ON public.assignment_completions FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Teachers see class completions" ON public.assignment_completions;
CREATE POLICY "Teachers see class completions" ON public.assignment_completions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.classroom_assignments ca WHERE ca.id = assignment_completions.assignment_id AND ca.teacher_id = auth.uid()
  ));


-- ── Ensure Analytics Events table exists (from tracker.ts) ───────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event       text NOT NULL,
  properties  jsonb,
  session_id  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events(event, created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own events" ON public.analytics_events;
CREATE POLICY "Users insert own events" ON public.analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Admins see all events" ON public.analytics_events;
CREATE POLICY "Admins see all events" ON public.analytics_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
