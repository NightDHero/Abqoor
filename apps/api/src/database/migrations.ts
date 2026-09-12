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
  migrateAdminAccounts(db);
  migrateSessionAnswerTiming(db);
  migratePersistentMediaStorage(db);
  migrateAdminImportSystem(db);
  migrateQuestionLearningFields(db);
};
