import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "../config/env.js";
import { runDatabaseMigrations } from "./migrations.js";

const databasePath = resolve(process.cwd(), env.databasePath);

mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY,
    username TEXT COLLATE NOCASE,
    profile_completed INTEGER NOT NULL DEFAULT 0 CHECK (profile_completed IN (0, 1)),
    target_score INTEGER CHECK (target_score IS NULL OR (target_score BETWEEN 50 AND 100)),
    has_exam_date INTEGER NOT NULL DEFAULT 0 CHECK (has_exam_date IN (0, 1)),
    exam_date TEXT,
    weekly_study_hours TEXT CHECK (
      weekly_study_hours IS NULL OR weekly_study_hours IN (
        'less_than_3',
        '3_to_5',
        '5_to_10',
        'more_than_15'
      )
    ),
    has_taken_qudurat INTEGER CHECK (has_taken_qudurat IS NULL OR has_taken_qudurat IN (0, 1)),
    attempt_count INTEGER CHECK (attempt_count IS NULL OR attempt_count >= 1),
    latest_score INTEGER CHECK (latest_score IS NULL OR (latest_score BETWEEN 0 AND 100)),
    weaker_section TEXT CHECK (
      weaker_section IS NULL OR weaker_section IN (
        'quantitative',
        'verbal',
        'both'
      )
    ),
    study_style_preference TEXT CHECK (
      study_style_preference IS NULL OR study_style_preference IN (
        'short_daily',
        'longer_few_times_weekly',
        'no_preference'
      )
    ),
    study_strategy_preference TEXT CHECK (
      study_strategy_preference IS NULL OR study_strategy_preference IN (
        'weakness_first',
        'balanced',
        'fastest_highest_score'
      )
    ),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admin_accounts (
    user_id TEXT PRIMARY KEY,
    granted_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS source_pdfs (
    id TEXT PRIMARY KEY,
    original_filename TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    uploaded_at TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size >= 0),
    page_count INTEGER CHECK (page_count IS NULL OR page_count >= 0),
    status TEXT NOT NULL CHECK (status IN ('uploaded', 'failed')),
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    question_image_url TEXT NOT NULL,
    image_storage_key TEXT,
    source_pdf_id TEXT,
    source_page INTEGER CHECK (source_page IS NULL OR source_page > 0),
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    subject TEXT NOT NULL CHECK (subject IN ('quantitative', 'verbal')),
    subject_id TEXT CHECK (subject_id IS NULL OR subject_id IN ('math', 'arabic')),
    topic TEXT NOT NULL,
    topic_id TEXT,
    subtopic TEXT,
    subtopic_id TEXT,
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    difficulty_score INTEGER CHECK (difficulty_score IS NULL OR (difficulty_score BETWEEN 1 AND 10)),
    estimated_time_seconds INTEGER,
    skill_tags TEXT,
    importance_weight REAL CHECK (importance_weight IS NULL OR (importance_weight >= 0 AND importance_weight <= 1)),
    source TEXT NOT NULL CHECK (source IN ('pdf', 'excel', 'manual')),
    version INTEGER NOT NULL,
    explanation_video_url TEXT,
    import_job_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (source_pdf_id) REFERENCES source_pdfs(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
  CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
  CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
  CREATE INDEX IF NOT EXISTS idx_questions_image_storage_key ON questions(image_storage_key);
  CREATE INDEX IF NOT EXISTS idx_questions_source_pdf_id ON questions(source_pdf_id);
  CREATE INDEX IF NOT EXISTS idx_source_pdfs_uploaded_at ON source_pdfs(uploaded_at);
  CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'images')),
    status TEXT NOT NULL CHECK (status IN (
      'analyzing', 'ready', 'importing', 'completed', 'failed', 'cancelled', 'rolled_back'
    )),
    start_question_number INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    source_pdf_id TEXT,
    excel_filename TEXT NOT NULL,
    media_filename TEXT NOT NULL,
    total_pages INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    success_count INTEGER NOT NULL,
    failure_count INTEGER NOT NULL,
    new_count INTEGER NOT NULL,
    duplicate_count INTEGER NOT NULL,
    created_count INTEGER NOT NULL,
    replaced_count INTEGER NOT NULL,
    skipped_count INTEGER NOT NULL,
    processed_count INTEGER NOT NULL,
    error_count INTEGER NOT NULL,
    sheet_summary_json TEXT NOT NULL,
    media_summary_json TEXT NOT NULL,
    issues_json TEXT NOT NULL,
    error_message TEXT,
    confirmed_at TEXT,
    completed_at TEXT,
    rolled_back_at TEXT,
    FOREIGN KEY (source_pdf_id) REFERENCES source_pdfs(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS import_job_items (
    import_job_id TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    question_id TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    excel_row_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_answer TEXT,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    page_number INTEGER,
    source_image_name TEXT,
    image_status TEXT NOT NULL CHECK (image_status IN ('matched', 'missing')),
    validation_status TEXT NOT NULL CHECK (validation_status IN ('valid', 'error')),
    errors_json TEXT NOT NULL,
    is_duplicate INTEGER NOT NULL CHECK (is_duplicate IN (0, 1)),
    duplicate_action TEXT CHECK (duplicate_action IS NULL OR duplicate_action IN ('replace', 'skip', 'stop')),
    outcome TEXT NOT NULL CHECK (outcome IN ('pending', 'created', 'replaced', 'skipped', 'failed')),
    previous_question_json TEXT,
    applied_question_json TEXT,
    previous_image_existed INTEGER NOT NULL DEFAULT 0 CHECK (previous_image_existed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (import_job_id, question_number),
    FOREIGN KEY (import_job_id) REFERENCES import_jobs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at);
  CREATE INDEX IF NOT EXISTS idx_import_jobs_source_pdf_id ON import_jobs(source_pdf_id);
  CREATE INDEX IF NOT EXISTS idx_import_job_items_question_id ON import_job_items(question_id);
  CREATE INDEX IF NOT EXISTS idx_import_job_items_outcome ON import_job_items(outcome);

  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_order TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_answers (
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    user_answer TEXT NOT NULL CHECK (user_answer IN ('A', 'B', 'C', 'D')),
    is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
    active_duration_seconds INTEGER CHECK (
      active_duration_seconds IS NULL OR active_duration_seconds >= 0
    ),
    created_at TEXT NOT NULL,
    PRIMARY KEY (session_id, question_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exam_results (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    math_score REAL NOT NULL CHECK (math_score >= 0 AND math_score <= 100),
    arabic_score REAL NOT NULL CHECK (arabic_score >= 0 AND arabic_score <= 100),
    final_score REAL NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS official_exams (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
    current_section INTEGER NOT NULL CHECK (current_section BETWEEN 1 AND 5),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS official_exam_sections (
    exam_id TEXT NOT NULL,
    section_number INTEGER NOT NULL CHECK (section_number BETWEEN 1 AND 5),
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed')),
    started_at TEXT,
    completed_at TEXT,
    PRIMARY KEY (exam_id, section_number),
    FOREIGN KEY (exam_id) REFERENCES official_exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS official_exam_questions (
    exam_id TEXT NOT NULL,
    section_number INTEGER NOT NULL CHECK (section_number BETWEEN 1 AND 5),
    position_in_section INTEGER NOT NULL CHECK (position_in_section BETWEEN 1 AND 25),
    global_position INTEGER NOT NULL CHECK (global_position BETWEEN 1 AND 125),
    category TEXT NOT NULL CHECK (category IN ('math', 'arabic')),
    question_id TEXT NOT NULL,
    user_answer TEXT CHECK (user_answer IS NULL OR user_answer IN ('A', 'B', 'C', 'D')),
    flagged INTEGER NOT NULL DEFAULT 0 CHECK (flagged IN (0, 1)),
    answered_at TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (exam_id, section_number, position_in_section),
    FOREIGN KEY (exam_id) REFERENCES official_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS official_exam_results (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    math_score REAL NOT NULL CHECK (math_score >= 0 AND math_score <= 100),
    arabic_score REAL NOT NULL CHECK (arabic_score >= 0 AND arabic_score <= 100),
    final_score REAL NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
    section_1_score REAL NOT NULL CHECK (section_1_score >= 0 AND section_1_score <= 100),
    section_2_score REAL NOT NULL CHECK (section_2_score >= 0 AND section_2_score <= 100),
    section_3_score REAL NOT NULL CHECK (section_3_score >= 0 AND section_3_score <= 100),
    section_4_score REAL NOT NULL CHECK (section_4_score >= 0 AND section_4_score <= 100),
    section_5_score REAL NOT NULL CHECK (section_5_score >= 0 AND section_5_score <= 100),
    created_at TEXT NOT NULL,
    FOREIGN KEY (exam_id) REFERENCES official_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS review_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('manual', 'wrong_answer')),
    added_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    review_after TEXT,
    spaced_repetition_state TEXT,
    ai_schedule_metadata TEXT,
    UNIQUE(user_id, question_id, source),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_session_answers_session_id ON session_answers(session_id);
  CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);
  CREATE INDEX IF NOT EXISTS idx_official_exams_user_id ON official_exams(user_id);
  CREATE INDEX IF NOT EXISTS idx_official_exam_questions_exam_id ON official_exam_questions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_official_exam_results_user_id ON official_exam_results(user_id);
  CREATE INDEX IF NOT EXISTS idx_review_items_user_id ON review_items(user_id);
  CREATE INDEX IF NOT EXISTS idx_review_items_question_id ON review_items(question_id);
  CREATE INDEX IF NOT EXISTS idx_review_items_source ON review_items(source);
  CREATE INDEX IF NOT EXISTS idx_admin_accounts_created_at ON admin_accounts(created_at);
`);

runDatabaseMigrations(db);

const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{
  name: string;
}>;

if (!sessionColumns.some((column) => column.name === "question_order")) {
  db.exec("ALTER TABLE sessions ADD COLUMN question_order TEXT NOT NULL DEFAULT '[]'");
}

const examResultColumns = db.prepare("PRAGMA table_info(exam_results)").all() as Array<{
  name: string;
}>;

if (!examResultColumns.some((column) => column.name === "session_id")) {
  type LegacyExamResultRecord = {
    id: string;
    user_id: string;
    math_score: number;
    arabic_score: number;
    final_score: number;
    created_at: string;
  };
  type CompletedSessionRecord = {
    session_id: string;
    user_id: string;
    updated_at: string;
  };

  const migrateExamResults = db.transaction(() => {
    const legacyExamResults = db
      .prepare("SELECT * FROM exam_results ORDER BY created_at ASC")
      .all() as LegacyExamResultRecord[];
    const completedSessions = db
      .prepare(
        `
          SELECT session_id, user_id, updated_at
          FROM sessions
          WHERE status = 'completed'
          ORDER BY updated_at ASC
        `
      )
      .all() as CompletedSessionRecord[];

    db.exec(`
      ALTER TABLE exam_results RENAME TO exam_results_legacy;
      DROP INDEX IF EXISTS idx_exam_results_user_id;
      DROP INDEX IF EXISTS idx_exam_results_session_id;

      CREATE TABLE exam_results (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        math_score REAL NOT NULL CHECK (math_score >= 0 AND math_score <= 100),
        arabic_score REAL NOT NULL CHECK (arabic_score >= 0 AND arabic_score <= 100),
        final_score REAL NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    const insertMigratedExamResult = db.prepare(`
      INSERT INTO exam_results (
        id,
        session_id,
        user_id,
        math_score,
        arabic_score,
        final_score,
        created_at
      )
      VALUES (
        @id,
        @sessionId,
        @user_id,
        @math_score,
        @arabic_score,
        @final_score,
        @created_at
      )
    `);
    const usedSessionIds = new Set<string>();

    for (const examResult of legacyExamResults) {
      const matchingSession = completedSessions
        .filter(
          (session) =>
            session.user_id === examResult.user_id &&
            !usedSessionIds.has(session.session_id)
        )
        .sort((left, right) => {
          const examTime = new Date(examResult.created_at).getTime();
          return (
            Math.abs(new Date(left.updated_at).getTime() - examTime) -
            Math.abs(new Date(right.updated_at).getTime() - examTime)
          );
        })[0];

      if (!matchingSession) {
        continue;
      }

      usedSessionIds.add(matchingSession.session_id);
      insertMigratedExamResult.run({
        ...examResult,
        sessionId: matchingSession.session_id
      });
    }

    db.exec("DROP TABLE exam_results_legacy;");
  });

  migrateExamResults();
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);
  CREATE INDEX IF NOT EXISTS idx_exam_results_session_id ON exam_results(session_id);
`);
