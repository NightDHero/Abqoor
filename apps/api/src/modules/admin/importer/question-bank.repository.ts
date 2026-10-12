import { createHash } from "node:crypto";
import { db } from "../../../database/client.js";
import type { LearningSubject } from "../../learning-taxonomy/taxonomy.js";

export type QuestionBankType = "general" | "aqsam";

export type QuestionBankRecord = {
  id: string;
  bank_type: QuestionBankType;
  bank_key: string;
  name: string;
  subject_id: LearningSubject | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const normalizeBankKey = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ar");

const bankIdForKey = (type: QuestionBankType, key: string) =>
  `bank-${createHash("sha256").update(`${type}:${key}`).digest("hex").slice(0, 20)}`;

export const ensureQuestionBank = async (input: {
  bankKey: string;
  bankType: QuestionBankType;
  createdBy: string;
  name: string;
  subjectId?: LearningSubject | null;
}) => {
  const bankKey = normalizeBankKey(input.bankKey);
  const now = new Date().toISOString();
  const record = {
    bankKey,
    bankType: input.bankType,
    createdAt: now,
    createdBy: input.createdBy,
    id: bankIdForKey(input.bankType, bankKey),
    name: input.name.trim(),
    subjectId: input.subjectId ?? null,
    updatedAt: now
  };
  await db.prepare(`
    INSERT INTO question_banks (
      id, bank_type, bank_key, name, subject_id, created_by, created_at, updated_at
    ) VALUES (
      @id, @bankType, @bankKey, @name, @subjectId, @createdBy, @createdAt, @updatedAt
    )
    ON CONFLICT(bank_type, bank_key) DO UPDATE SET
      name = excluded.name,
      subject_id = COALESCE(excluded.subject_id, question_banks.subject_id),
      updated_at = excluded.updated_at
  `).run(record);
  return await db.prepare<string, QuestionBankRecord>(`
    SELECT * FROM question_banks WHERE id = ?
  `).get(record.id) as QuestionBankRecord;
};

export const listAqsamBanks = async () =>
  await db.prepare<[], QuestionBankRecord & { question_count: number }>(`
    SELECT question_banks.*, CAST(COUNT(questions.id) AS INTEGER) AS question_count
    FROM question_banks
    LEFT JOIN questions ON questions.bank_id = question_banks.id
    WHERE question_banks.bank_type = 'aqsam'
    GROUP BY question_banks.id
    ORDER BY question_banks.created_at DESC
  `).all();
