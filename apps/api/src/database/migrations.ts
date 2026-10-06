import type Database from "better-sqlite3";
import {
  resolveQuestionClassification,
  type LegacyQuestionSubject
} from "../modules/learning-taxonomy/taxonomy.js";

type TableColumn = {
  name: string;
};

type QuestionClassificationRecord = {
  difficulty: number;
  difficulty_score: number | null;
  id: string;
  subject: LegacyQuestionSubject;
  subject_id: string | null;
  subtopic: string | null;
  subtopic_id: string | null;
  topic: string;
  topic_id: string | null;
};

const getColumns = (db: Database.Database, tableName: string) => {
  return db.prepare(`PRAGMA table_info(${tableName})`).all() as TableColumn[];
};

const hasColumn = (
  db: Database.Database,
  tableName: string,
  columnName: string
) => {
  return getColumns(db, tableName).some((column) => column.name === columnName);
};

const addColumnIfMissing = (
  db: Database.Database,
  tableName: string,
  columnName: string,
  definition: string
) => {
  if (!hasColumn(db, tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const migrateQuestionLearningFields = (db: Database.Database) => {
  addColumnIfMissing(
    db,
    "questions",
    "subject_id",
    "TEXT CHECK (subject_id IS NULL OR subject_id IN ('math', 'arabic'))"
  );
  addColumnIfMissing(db, "questions", "topic_id", "TEXT");
  addColumnIfMissing(db, "questions", "subtopic_id", "TEXT");
  addColumnIfMissing(
    db,
    "questions",
    "difficulty_score",
    "INTEGER CHECK (difficulty_score IS NULL OR (difficulty_score BETWEEN 1 AND 10))"
  );

  const questions = db
    .prepare(
      `
        SELECT
          id,
          subject,
          topic,
          subtopic,
          difficulty,
          subject_id,
          topic_id,
          subtopic_id,
          difficulty_score
        FROM questions
      `
    )
    .all() as QuestionClassificationRecord[];

  const updateQuestion = db.prepare(`
    UPDATE questions
    SET
      subject_id = COALESCE(subject_id, @subjectId),
      topic_id = COALESCE(topic_id, @topicId),
      subtopic_id = COALESCE(subtopic_id, @subtopicId),
      difficulty_score = COALESCE(difficulty_score, @difficultyScore)
    WHERE id = @id
  `);

  const backfill = db.transaction(() => {
    for (const question of questions) {
      const classification = resolveQuestionClassification({
        difficulty: question.difficulty,
        difficultyScore: question.difficulty_score,
        legacySubject: question.subject,
        subject: question.subject_id,
        subtopic: question.subtopic,
        subtopicId: question.subtopic_id,
        topic: question.topic,
        topicId: question.topic_id
      });

      updateQuestion.run({
        difficultyScore:
          question.difficulty_score ?? classification.difficultyScore,
        id: question.id,
        subjectId: question.subject_id ?? classification.subjectId,
        subtopicId: question.subtopic_id ?? classification.subtopicId,
        topicId: question.topic_id ?? classification.topicId
      });
    }
  });

  backfill();

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_questions_subtopic_id ON questions(subtopic_id);
    CREATE INDEX IF NOT EXISTS idx_questions_difficulty_score ON questions(difficulty_score);
  `);
};

const migrateStudentProfileIdentity = (db: Database.Database) => {
  addColumnIfMissing(db, "student_profiles", "username", "TEXT COLLATE NOCASE");
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_username
    ON student_profiles(username COLLATE NOCASE)
    WHERE username IS NOT NULL
  `);
};

const migrateStudentStudyPlan = (db: Database.Database) => {
  addColumnIfMissing(db, "student_profiles", "study_plan_start_date", "TEXT");
  addColumnIfMissing(
    db,
    "student_profiles",
    "weekly_rest_days_json",
    "TEXT NOT NULL DEFAULT '[]'"
  );
  addColumnIfMissing(
    db,
    "student_profiles",
    "study_plan_bank_count",
    "INTEGER CHECK (study_plan_bank_count IS NULL OR study_plan_bank_count > 0)"
  );
  addColumnIfMissing(
    db,
    "student_profiles",
    "study_plan_study_days",
    "INTEGER CHECK (study_plan_study_days IS NULL OR study_plan_study_days > 0)"
  );
  addColumnIfMissing(
    db,
    "student_profiles",
    "study_plan_calendar_days",
    "INTEGER CHECK (study_plan_calendar_days IS NULL OR study_plan_calendar_days > 0)"
  );
  addColumnIfMissing(db, "student_profiles", "study_plan_completion_date", "TEXT");
};

const migrateStudentSchedule = (db: Database.Database) => {
  const hadRestDay = hasColumn(db, "student_profiles", "weekly_rest_day");
  addColumnIfMissing(
    db,
    "student_profiles",
    "weekly_rest_day",
    "INTEGER NOT NULL DEFAULT 5 CHECK (weekly_rest_day BETWEEN 0 AND 6)"
  );
  addColumnIfMissing(
    db,
    "student_profiles",
    "weekly_review_day",
    "INTEGER NOT NULL DEFAULT 6 CHECK (weekly_review_day BETWEEN 0 AND 6)"
  );

  if (!hadRestDay) {
    const profiles = db
      .prepare("SELECT user_id, weekly_rest_days_json FROM student_profiles")
      .all() as Array<{ user_id: string; weekly_rest_days_json: string }>;
    const update = db.prepare(`
      UPDATE student_profiles
      SET weekly_rest_day = @restDay, weekly_review_day = @reviewDay
      WHERE user_id = @userId
    `);

    const backfill = db.transaction(() => {
      for (const profile of profiles) {
        let restDay = 5;
        try {
          const parsed = JSON.parse(profile.weekly_rest_days_json) as unknown;
          if (Array.isArray(parsed)) {
            const firstValid = parsed.find(
              (day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6
            );
            if (firstValid !== undefined) restDay = Number(firstValid);
          }
        } catch {
          restDay = 5;
        }

        update.run({
          restDay,
          reviewDay: restDay === 6 ? 5 : 6,
          userId: profile.user_id
        });
      }
    });
    backfill();
  }
};

const migrateStudentWeekdayAssignments = (db: Database.Database) => {
  addColumnIfMissing(
    db,
    "student_profiles",
    "quantitative_study_days_json",
    "TEXT NOT NULL DEFAULT '[]'"
  );
  addColumnIfMissing(
    db,
    "student_profiles",
    "verbal_study_days_json",
    "TEXT NOT NULL DEFAULT '[]'"
  );

  const profiles = db.prepare(`
    SELECT user_id, weekly_rest_day, weekly_review_day, quantitative_study_days_json,
      verbal_study_days_json
    FROM student_profiles
  `).all() as Array<{
    quantitative_study_days_json: string;
    user_id: string;
    verbal_study_days_json: string;
    weekly_rest_day: number;
    weekly_review_day: number;
  }>;
  const update = db.prepare(`
    UPDATE student_profiles
    SET quantitative_study_days_json = @quantitativeDays,
      verbal_study_days_json = @verbalDays
    WHERE user_id = @userId
  `);

  for (const profile of profiles) {
    const restDay = Number.isInteger(profile.weekly_rest_day) &&
      profile.weekly_rest_day >= 0 && profile.weekly_rest_day <= 6
      ? profile.weekly_rest_day
      : 5;
    const reviewDay = Number.isInteger(profile.weekly_review_day) &&
      profile.weekly_review_day >= 0 && profile.weekly_review_day <= 6 &&
      profile.weekly_review_day !== restDay
      ? profile.weekly_review_day
      : restDay === 6 ? 5 : 6;
    const parseDays = (value: string) => {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed)
          ? [...new Set(parsed.filter((day) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6).map(Number))]
          : [];
      } catch {
        return [];
      }
    };
    const quantitativeDays = parseDays(profile.quantitative_study_days_json);
    const verbalDays = parseDays(profile.verbal_study_days_json);
    const allRoles = new Set([...quantitativeDays, ...verbalDays, restDay, reviewDay]);
    const hasValidAssignments =
      [2, 3].includes(quantitativeDays.length) &&
      [2, 3].includes(verbalDays.length) &&
      quantitativeDays.length + verbalDays.length === 5 &&
      allRoles.size === 7;
    if (hasValidAssignments) continue;

    const availableDays = [0, 1, 2, 3, 4, 5, 6].filter(
      (day) => day !== restDay && day !== reviewDay
    );
    update.run({
      quantitativeDays: JSON.stringify(availableDays.filter((_day, index) => index % 2 === 0)),
      userId: profile.user_id,
      verbalDays: JSON.stringify(availableDays.filter((_day, index) => index % 2 === 1))
    });
  }
};

const migrateAccountRecovery = (db: Database.Database) => {
  addColumnIfMissing(db, "users", "phone_number", "TEXT");
  addColumnIfMissing(
    db,
    "users",
    "session_version",
    "INTEGER NOT NULL DEFAULT 0"
  );
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number
    ON users(phone_number)
    WHERE phone_number IS NOT NULL;

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON password_reset_tokens(user_id);

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
    ON password_reset_tokens(expires_at);
  `);
};

const migrateSecurityHardening = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
    ON auth_sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
    ON auth_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS security_bootstrap_state (
      bootstrap_key TEXT PRIMARY KEY,
      consumed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_security_lock (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nonce INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO admin_security_lock (id, nonce) VALUES (1, 0);
  `);
  addColumnIfMissing(db, "official_exam_sections", "deadline_at", "TEXT");
  db.exec(`
    UPDATE official_exam_sections
    SET deadline_at = datetime(started_at, '+25 minutes')
    WHERE started_at IS NOT NULL AND deadline_at IS NULL;
  `);
};

const migrateAuthIdentityVerification = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email
    ON email_verification_codes(email);

    CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires_at
    ON email_verification_codes(expires_at);

    CREATE TABLE IF NOT EXISTS auth_external_identities (
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (provider, provider_subject),
      UNIQUE (provider, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_auth_external_identities_user_id
    ON auth_external_identities(user_id);
  `);
};

const migrateVerifiedContactIdentities = (db: Database.Database) => {
  addColumnIfMissing(db, "users", "email_verified_at", "TEXT");
  addColumnIfMissing(db, "users", "phone_verified_at", "TEXT");
  db.exec(`
    UPDATE users
    SET email_verified_at = created_at
    WHERE email_verified_at IS NULL;

    CREATE TABLE IF NOT EXISTS phone_verification_requests (
      id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'link')),
      user_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_phone_verification_requests_destination
    ON phone_verification_requests(phone_number, purpose, created_at);
  `);
};

const migrateDailyPlanSessions = (db: Database.Database) => {
  addColumnIfMissing(db, "sessions", "subject_id", "TEXT");
  addColumnIfMissing(db, "sessions", "plan_date", "TEXT");
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_active_daily_plan
    ON sessions(user_id, subject_id, plan_date)
    WHERE status = 'active' AND subject_id IS NOT NULL AND plan_date IS NOT NULL;
  `);
};

const migrateAdminAccounts = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      user_id TEXT PRIMARY KEY,
      granted_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_accounts_created_at
    ON admin_accounts(created_at);
  `);
};

const migrateSessionAnswerTiming = (db: Database.Database) => {
  addColumnIfMissing(
    db,
    "session_answers",
    "active_duration_seconds",
    "INTEGER CHECK (active_duration_seconds IS NULL OR active_duration_seconds >= 0)"
  );
};

const migratePersistentMediaStorage = (db: Database.Database) => {
  db.exec(`
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
  `);

  addColumnIfMissing(db, "questions", "image_storage_key", "TEXT");
  addColumnIfMissing(db, "questions", "source_pdf_id", "TEXT");
  addColumnIfMissing(
    db,
    "questions",
    "source_page",
    "INTEGER CHECK (source_page IS NULL OR source_page > 0)"
  );
  addColumnIfMissing(db, "import_jobs", "source_pdf_id", "TEXT");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_image_storage_key
    ON questions(image_storage_key);

    CREATE INDEX IF NOT EXISTS idx_questions_source_pdf_id
    ON questions(source_pdf_id);

    CREATE INDEX IF NOT EXISTS idx_import_jobs_source_pdf_id
    ON import_jobs(source_pdf_id);

    CREATE INDEX IF NOT EXISTS idx_source_pdfs_uploaded_at
    ON source_pdfs(uploaded_at);
  `);
};

const createAdminImportTables = (db: Database.Database) => {
  db.exec(`
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
      subtopic TEXT,
      subtopic_id TEXT,
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
  `);
};

const migrateAdminImportSystem = (db: Database.Database) => {
  addColumnIfMissing(db, "questions", "import_job_id", "TEXT");

  const importJobColumns = getColumns(db, "import_jobs");
  const isLegacyImportTable =
    importJobColumns.length > 0 &&
    !importJobColumns.some((column) => column.name === "updated_at");

  if (isLegacyImportTable) {
    const migrate = db.transaction(() => {
      db.exec("DROP TABLE IF EXISTS import_job_items");
      db.exec("ALTER TABLE import_jobs RENAME TO import_jobs_legacy");
      createAdminImportTables(db);
      db.exec(`
        INSERT INTO import_jobs (
          id, source_type, status, start_question_number, created_at, updated_at,
          created_by, source_pdf_id, excel_filename, media_filename, total_pages, total_questions,
          success_count, failure_count, new_count, duplicate_count, created_count,
          replaced_count, skipped_count, processed_count, error_count,
          sheet_summary_json, media_summary_json, issues_json, error_message,
          confirmed_at, completed_at, rolled_back_at
        )
        SELECT
          id,
          CASE WHEN source_type = 'pdf' THEN 'pdf' ELSE 'images' END,
          CASE
            WHEN status = 'preview' THEN 'ready'
            WHEN status = 'committed' THEN 'completed'
            ELSE status
          END,
          start_question_number,
          created_at,
          created_at,
          created_by,
          NULL,
          '',
          '',
          total_pages,
          total_pages,
          success_count,
          failure_count,
          success_count,
          0,
          CASE WHEN status = 'committed' THEN success_count ELSE 0 END,
          0,
          0,
          success_count + failure_count,
          failure_count,
          '{}',
          '{}',
          '[]',
          NULL,
          CASE WHEN status = 'committed' THEN created_at ELSE NULL END,
          CASE WHEN status = 'committed' THEN created_at ELSE NULL END,
          NULL
        FROM import_jobs_legacy;

        DROP TABLE import_jobs_legacy;
      `);
    });

    migrate();
  } else {
    createAdminImportTables(db);
  }

  addColumnIfMissing(db, "import_jobs", "source_pdf_id", "TEXT");
  addColumnIfMissing(db, "import_job_items", "subtopic", "TEXT");
  addColumnIfMissing(db, "import_job_items", "subtopic_id", "TEXT");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_import_job_id ON questions(import_job_id);
    CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at);
    CREATE INDEX IF NOT EXISTS idx_import_jobs_source_pdf_id ON import_jobs(source_pdf_id);
    CREATE INDEX IF NOT EXISTS idx_import_job_items_question_id ON import_job_items(question_id);
    CREATE INDEX IF NOT EXISTS idx_import_job_items_outcome ON import_job_items(outcome);
  `);
};

export const runDatabaseMigrations = (db: Database.Database) => {
  migrateStudentProfileIdentity(db);
  migrateStudentStudyPlan(db);
  migrateStudentSchedule(db);
  migrateStudentWeekdayAssignments(db);
  migrateAccountRecovery(db);
  migrateDailyPlanSessions(db);
  migrateAdminAccounts(db);
  migrateSessionAnswerTiming(db);
  migratePersistentMediaStorage(db);
  migrateAdminImportSystem(db);
  migrateQuestionLearningFields(db);
  migrateSecurityHardening(db);
  migrateAuthIdentityVerification(db);
  migrateVerifiedContactIdentities(db);
};
