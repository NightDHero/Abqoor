import type { SessionResult } from "../../types/session";
import { SummaryMetric } from "../../components/ui/SummaryMetric";
import { navigateTo } from "../../utils/router";

export function PracticeResult({ result }: { result: SessionResult }) {
  return (
    <section className="practice-result" aria-labelledby="practice-result-title">
      <header className="practice-result-hero">
        <p className="page-eyebrow">نتيجة التدريب</p>
        <h1 className="page-title" id="practice-result-title">
          انتهت الجلسة
        </h1>
      </header>

      <section className="result-overview" aria-label="ملخص التدريب">
        <div className="result-score">
          <span>دقة التدريب</span>
          <strong>{result.finalScorePercentage}%</strong>
          <small>{result.correctAnswers} من {result.totalQuestions}</small>
        </div>
        <div className="result-metrics">
          <SummaryMetric label="إجابات صحيحة" tone="positive" value={result.correctAnswers} />
          <SummaryMetric label="غير صحيحة" tone="attention" value={result.incorrectAnswers} />
          <SummaryMetric label="إجمالي الأسئلة" value={result.totalQuestions} />
        </div>
      </section>

      <div className="action-row">
        <button type="button" onClick={() => navigateTo("/career")}>
          العودة إلى المسار
        </button>
      </div>
    </section>
  );
}
