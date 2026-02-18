-- ============================================================================
-- STUNITY ENTERPRISE COMPLETE DATABASE SCHEMA
-- Based on Prisma Schema v2.0
-- Modules: Core, LMS, Social, Messaging, Courses, Gamification, Clubs
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. CORE & AUTH (Schools, Users)
-- ============================================================================

create table if not exists public.schools (
  id text primary key, -- CUID
  name text not null,
  slug text unique not null,
  email text unique,
  phone text,
  address text,
  logo text,
  website text,
  subscription_tier text default 'FREE_TRIAL_1M',
  subscription_start timestamp with time zone default now(),
  subscription_end timestamp with time zone,
  is_active boolean default true,
  is_trial boolean default true,
  max_students int default 100,
  max_teachers int default 10,
  current_students int default 0,
  current_teachers int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  school_type text default 'HIGH_SCHOOL',
  country_code text default 'KH'
);

create table if not exists public.users (
  id uuid references auth.users not null primary key, -- Linked to Supabase Auth
  school_id text references public.schools(id) on delete cascade,
  email text unique,
  first_name text,
  last_name text,
  username text unique,
  role text default 'STUDENT', -- ADMIN, TEACHER, STUDENT, PARENT
  account_type text default 'SOCIAL_ONLY', -- SOCIAL_ONLY, SCHOOL_ONLY, HYBRID
  
  -- Profile Fields
  bio text,
  headline text,
  profile_picture_url text,
  cover_photo_url text,
  phone text unique,
  location text,
  
  -- Stats
  level int default 1,
  xp int default 0,
  total_points int default 0,
  current_streak int default 0,
  
  -- Status
  is_active boolean default true,
  is_verified boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================================================
-- 2. LMS BASE (Years, Settings, Calendar)
-- ============================================================================

create table if not exists public.academic_years (
  id text primary key,
  school_id text references public.schools(id) on delete cascade not null,
  name text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  is_current boolean default false,
  status text default 'planning',
  created_at timestamp with time zone default now()
);

create table if not exists public.academic_terms (
  id text primary key,
  academic_year_id text references public.academic_years(id) on delete cascade not null,
  name text not null,
  term_number int,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.school_settings (
  id text primary key,
  school_id text unique references public.schools(id) on delete cascade not null,
  default_pass_grade float default 50.0,
  uses_gpa boolean default true,
  created_at timestamp with time zone default now()
);

-- ============================================================================
-- 3. PEOPLE (Students, Teachers, Parents)
-- ============================================================================

create table if not exists public.classes (
  id text primary key,
  school_id text references public.schools(id) not null,
  academic_year_id text references public.academic_years(id) not null,
  name text not null,
  grade text not null,
  section text,
  created_at timestamp with time zone default now()
  -- homeroom_teacher_id added via alter later to avoid circular dep
);

create table if not exists public.students (
  id text primary key,
  school_id text references public.schools(id) not null,
  user_id uuid references public.users(id), -- Link to user account
  student_id text, -- Internal ID
  permanent_id text unique,
  first_name text not null,
  last_name text not null,
  khmer_name text,
  gender text,
  date_of_birth text,
  class_id text references public.classes(id),
  photo_url text,
  is_account_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.teachers (
  id text primary key,
  school_id text references public.schools(id) not null,
  user_id uuid references public.users(id),
  teacher_id text,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  position text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.parents (
  id text primary key,
  user_id uuid references public.users(id),
  first_name text,
  last_name text,
  phone text unique,
  email text,
  is_account_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.student_parents (
  id text primary key,
  student_id text references public.students(id) on delete cascade,
  parent_id text references public.parents(id) on delete cascade,
  relationship text,
  is_primary boolean default false
);

-- ============================================================================
-- 4. ACADEMICS (Subjects, Grading, Attendance)
-- ============================================================================

create table if not exists public.subjects (
  id text primary key,
  name text not null,
  code text unique,
  grade text,
  credit float default 1.0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.grades (
  id text primary key,
  student_id text references public.students(id) on delete cascade,
  class_id text references public.classes(id),
  subject_id text references public.subjects(id),
  score float,
  max_score float default 100,
  month text,
  year int,
  type text default 'MONTHLY',
  created_at timestamp with time zone default now()
);

create table if not exists public.attendance (
  id text primary key,
  student_id text references public.students(id) on delete cascade,
  class_id text references public.classes(id),
  date timestamp with time zone not null,
  status text not null, -- PRESENT, ABSENT, LATE, PERMISSION
  remarks text,
  created_at timestamp with time zone default now()
);

create table if not exists public.timetable_entries (
  id text primary key,
  school_id text references public.schools(id),
  class_id text references public.classes(id),
  subject_id text references public.subjects(id),
  teacher_id text references public.teachers(id),
  day_of_week text, -- MONDAY, TUESDAY...
  start_time text,
  end_time text,
  room text,
  created_at timestamp with time zone default now()
);

-- ============================================================================
-- 5. SOCIAL FEED
-- ============================================================================

create table if not exists public.posts (
  id text primary key,
  author_id uuid references public.users(id) on delete cascade,
  study_club_id text, -- references study_clubs
  content text,
  title text,
  media_urls text[],
  post_type text default 'ARTICLE',
  visibility text default 'PUBLIC',
  likes_count int default 0,
  comments_count int default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.comments (
  id text primary key,
  post_id text references public.posts(id) on delete cascade,
  author_id uuid references public.users(id) on delete cascade,
  content text,
  parent_id text references public.comments(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.likes (
  id text primary key,
  post_id text references public.posts(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);

create table if not exists public.poll_options (
  id text primary key,
  post_id text references public.posts(id) on delete cascade,
  text text not null,
  votes_count int default 0,
  position int default 0
);

-- ============================================================================
-- 6. MESSAGING (Direct & Teacher-Parent)
-- ============================================================================

create table if not exists public.conversations (
  id text primary key, -- Teacher-Parent
  teacher_id text references public.teachers(id) on delete cascade,
  parent_id text references public.parents(id) on delete cascade,
  student_id text references public.students(id),
  last_message_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text references public.conversations(id) on delete cascade,
  sender_id text, -- Can be UUID or TeacherID/ParentID depending on impl
  content text,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.dm_conversations (
  id text primary key, -- User-User
  is_group boolean default false,
  group_name text,
  last_message_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table if not exists public.dm_participants (
  id text primary key,
  conversation_id text references public.dm_conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  last_read_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(conversation_id, user_id)
);

create table if not exists public.direct_messages (
  id text primary key,
  conversation_id text references public.dm_conversations(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  content text,
  message_type text default 'TEXT',
  media_url text,
  created_at timestamp with time zone default now()
);

-- ============================================================================
-- 7. STUDY CLUBS (Advanced)
-- ============================================================================

create table if not exists public.study_clubs (
  id text primary key,
  name text not null,
  description text,
  type text default 'CASUAL_STUDY_GROUP',
  mode text default 'PUBLIC',
  creator_id uuid references public.users(id),
  school_id text references public.schools(id),
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.club_members (
  id text primary key,
  club_id text references public.study_clubs(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text default 'STUDENT',
  joined_at timestamp with time zone default now(),
  unique(club_id, user_id)
);

create table if not exists public.club_sessions (
  id text primary key,
  club_id text references public.study_clubs(id) on delete cascade,
  title text not null,
  session_date timestamp with time zone,
  start_time text,
  end_time text,
  meeting_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.club_assignments (
  id text primary key,
  club_id text references public.study_clubs(id) on delete cascade,
  title text not null,
  due_date timestamp with time zone,
  max_points int default 100,
  created_at timestamp with time zone default now()
);

create table if not exists public.club_assignment_submissions (
  id text primary key,
  assignment_id text references public.club_assignments(id) on delete cascade,
  member_id text references public.club_members(id) on delete cascade,
  content text,
  attachments json,
  status text default 'SUBMITTED',
  score float,
  submitted_at timestamp with time zone default now()
);

-- ============================================================================
-- 8. COURSES & E-LEARNING
-- ============================================================================

create table if not exists public.courses (
  id text primary key,
  title text not null,
  description text,
  thumbnail text,
  instructor_id uuid references public.users(id),
  price float default 0,
  is_published boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.lessons (
  id text primary key,
  course_id text references public.courses(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  "order" int,
  created_at timestamp with time zone default now()
);

create table if not exists public.enrollments (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,
  course_id text references public.courses(id) on delete cascade,
  progress float default 0,
  enrolled_at timestamp with time zone default now(),
  unique(user_id, course_id)
);

create table if not exists public.learning_paths (
  id text primary key,
  title text not null,
  description text,
  creator_id uuid references public.users(id),
  is_published boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================================================
-- 9. GAMIFICATION & EVENTS
-- ============================================================================

create table if not exists public.user_stats (
  id text primary key,
  user_id uuid unique references public.users(id) on delete cascade,
  xp int default 0,
  level int default 1,
  total_quizzes int default 0,
  win_streak int default 0,
  updated_at timestamp with time zone default now()
);

create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text,
  xp_reward int,
  badge_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_achievements (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,
  achievement_id text references public.achievements(id) on delete cascade,
  unlocked_at timestamp with time zone default now(),
  unique(user_id, achievement_id)
);

create table if not exists public.events (
  id text primary key,
  title text not null,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  location text,
  privacy text default 'PUBLIC',
  creator_id uuid references public.users(id),
  school_id text references public.schools(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.event_attendees (
  id text primary key,
  event_id text references public.events(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  status text default 'GOING',
  created_at timestamp with time zone default now(),
  unique(event_id, user_id)
);

-- ============================================================================
-- 10. NOTIFICATIONS & STORIES
-- ============================================================================

create table if not exists public.notifications (
  id text primary key,
  recipient_id uuid references public.users(id) on delete cascade,
  actor_id uuid references public.users(id),
  type text not null,
  title text,
  message text,
  entity_id text,
  entity_type text,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.stories (
  id text primary key,
  author_id uuid references public.users(id) on delete cascade,
  media_url text,
  text text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.story_views (
  id text primary key,
  story_id text references public.stories(id) on delete cascade,
  viewer_id uuid references public.users(id) on delete cascade,
  viewed_at timestamp with time zone default now(),
  unique(story_id, viewer_id)
);

-- ============================================================================
-- 11. ENABLE REALTIME
-- ============================================================================

alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.study_clubs;
alter publication supabase_realtime add table public.club_members;
alter publication supabase_realtime add table public.grades;

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) - Basic Setup
-- ============================================================================

-- Enable RLS on all tables (example subset)
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.grades enable row level security;
alter table public.direct_messages enable row level security;

-- Public Read Policies
create policy "Public posts are viewable by everyone" on public.posts for select using (visibility = 'PUBLIC');
create policy "Users can view their own profile" on public.users for select using (true);

-- Private Read Policies
create policy "Users can view their own grades" on public.grades for select using (auth.uid() = (select user_id from public.students where id = student_id));
create policy "DMs only viewable by participants" on public.direct_messages for select using (
  auth.uid() in (select user_id from public.dm_participants where conversation_id = direct_messages.conversation_id)
);

-- Update trigger for auth.users -> public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, first_name, last_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', 'STUDENT');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
