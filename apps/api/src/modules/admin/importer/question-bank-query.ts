export type AdminQuestionBankMode = "general" | "aqsam";
export type AdminQuestionBankStatus = "active" | "archived" | "all";

export const buildAdminQuestionTopicCountQuery = (input: {
  bankId?: string;
  questionScope: AdminQuestionBankMode;
  status?: AdminQuestionBankStatus;
}) => {
  const bankId = input.bankId?.trim() || null;
  const bankFilter = bankId ? "AND bank_id = @bankId" : "";
  const statusFilter = input.status === "archived"
    ? "AND archived_at IS NOT NULL"
    : input.status === "all"
      ? ""
      : "AND archived_at IS NULL";

  return {
    params: bankId
      ? { bankId, questionScope: input.questionScope }
      : { questionScope: input.questionScope },
    sql: `
      SELECT
        subject,
        subject_id,
        topic,
        topic_id,
        subtopic,
        subtopic_id,
        CAST(COUNT(*) AS INTEGER) AS question_count
      FROM questions
      WHERE question_scope = @questionScope
        ${statusFilter}
        ${bankFilter}
      GROUP BY subject, subject_id, topic, topic_id, subtopic, subtopic_id
      ORDER BY subject_id ASC, topic_id ASC, subtopic_id ASC
    `
  };
};
