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

export const runDatabaseMigrations = (db: Database.Database) => {
  migrateQuestionLearningFields(db);
};
