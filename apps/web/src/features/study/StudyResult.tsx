import type { SessionResult } from "../../types/session";
import { SummaryMetric } from "../../components/ui/SummaryMetric";

export function StudyResult({
  onStartNextSession,
  result,
  weakTopics
}: {
  onStartNextSession: () => void;
  result: SessionResult;
  weakTopics: string[];
}) {
  return (
    <section className="study-result" aria-labelledby="study-result-title">
      <header className="study-result-hero">
        <p className="page-eyebrow">نتيجة جلسة الدراسة</p>
        <h1 className="page-title" id="study-result-title">
          انتهت الجلسة
        </h1>
      </header>

      <section className="result-overview" aria-label="ملخص الجلسة">
        <div className="result-score">
          <span>دقة الجلسة</span>
          <strong>{result.finalScorePercentage}%</strong>
          <small>{result.correctAnswers} إجابات صحيحة</small>
        </div>
        <div className="result-metrics">
          <SummaryMetric label="تمت الإجابة" value={result.answeredQuestions} />
          <SummaryMetric label="غير صحيحة" tone="attention" value={result.incorrectAnswers} />
          <SummaryMetric label="متروكة" value={result.unansweredQuestions} />
          <SummaryMetric label="إجمالي الأسئلة" value={result.totalQuestions} />
        </div>
      </section>

      <section className="study-result-block">
        <h2>الموضوعات الضعيفة في هذه الجلسة</h2>
        {weakTopics.length > 0 ? (
          <ul className="simple-list">
            {weakTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        ) : (
          <p className="status-message">
            لم تظهر موضوعات ضعيفة من الأسئلة التي تمت الإجابة عنها.
          </p>
        )}
      </section>

      <section className="study-result-block">
        <h2>الجلسة المقترحة التالية</h2>
        <p>
          ابدأ جلسة دراسة تكيفية جديدة. سيستخدم النظام سجل إجاباتك السابق
          والأسئلة الخاطئة وغير المجابة لاختيار المجموعة التالية.
        </p>
        <div className="action-row">
          <button type="button" onClick={onStartNextSession}>
            ابدأ جلسة جديدة
          </button>
        </div>
      </section>
    </section>
  );
}
