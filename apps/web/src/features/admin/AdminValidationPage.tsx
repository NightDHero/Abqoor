import { useEffect, useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { SummaryMetric } from "../../components/ui/SummaryMetric";
import { env } from "../../config/env";
import { adminService } from "../../services/adminService";
import { HttpError } from "../../services/http";
import type { ValidationQuestion, ValidationSummary } from "../../types/admin";

const toImageSrc = (question: ValidationQuestion) =>
  question.question_image_url.startsWith("http")
    ? question.question_image_url
    : `${env.apiUrl}${question.question_image_url}`;

export function AdminValidationPage() {
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [questions, setQuestions] = useState<ValidationQuestion[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadValidationData = async () => {
      setError("");
      setIsLoading(true);

      try {
        const [summaryData, questionsData] = await Promise.all([
          adminService.getValidationSummary(),
          adminService.getValidationQuestions()
        ]);
        setSummary(summaryData);
        setQuestions(questionsData.questions);
      } catch (caughtError) {
        setError(
          caughtError instanceof HttpError
            ? caughtError.message
            : "تعذر تحميل بيانات التحقق."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadValidationData();
  }, []);

  return (
    <PageContainer
      eyebrow="إدارة"
      title="لوحة التحقق"
    >
      {isLoading ? <p className="status-message">جاري التحميل...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {summary ? (
        <section className="admin-summary" aria-label="ملخص التحقق">
          <SummaryMetric label="إجمالي الأسئلة" value={summary.totalQuestions} />
          <SummaryMetric label="المرفوعة" tone="positive" value={summary.importedQuestions} />
          <SummaryMetric label="الفاشلة" tone="attention" value={summary.failedQuestions} />
          <SummaryMetric label="إجابات ناقصة" tone="attention" value={summary.missingCorrectAnswers} />
          <SummaryMetric label="صور ناقصة" tone="attention" value={summary.missingImages} />
        </section>
      ) : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>المعرف</th>
              <th>الصورة</th>
              <th>الإجابة</th>
              <th>الموضوع</th>
              <th>الصعوبة</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.id}>
                <td dir="ltr">{question.id}</td>
                <td>
                  <img
                    alt={`Question ${question.id}`}
                    className="question-thumb"
                    src={toImageSrc(question)}
                  />
                </td>
                <td>{question.correct_answer}</td>
                <td>{question.topic}</td>
                <td>{question.difficulty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
