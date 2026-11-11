export type AdminQuestionBankMode = "general" | "aqsam";

export const buildAdminQuestionTopicCountQuery = (input: {
  bankId?: string;
  questionScope: AdminQuestionBankMode;
}) => {
  const bankId = input.bankId?.trim() || null;
  const bankFilter = bankId ? "AND bank_id = @bankId" : "";

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
        AND archived_at IS NULL
        ${bankFilter}
      GROUP BY subject, subject_id, topic, topic_id, subtopic, subtopic_id
      ORDER BY subject_id ASC, topic_id ASC, subtopic_id ASC
    `
  };
};
