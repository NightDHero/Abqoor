import type { ExamCategory, ExamResult, ExamTopicScore } from "../../types/exam";

const officialTopics: Record<
  ExamCategory,
  Array<{ topicId: string; topicName: string }>
> = {
  arabic: [
    { topicId: "verbal-analogy", topicName: "التناظر اللفظي" },
    { topicId: "sentence-completion", topicName: "إكمال الجمل" },
    { topicId: "contextual-error", topicName: "الخطأ السياقي" },
    { topicId: "odd-word", topicName: "المفردة الشاذة" },
    { topicId: "reading-comprehension", topicName: "استيعاب المقروء" }
  ],
  math: [
    { topicId: "arithmetic", topicName: "الحساب" },
    { topicId: "algebra", topicName: "الجبر" },
    { topicId: "geometry", topicName: "الهندسة" },
    { topicId: "statistics", topicName: "الإحصاء والاحتمالات" },
    { topicId: "visual-patterns", topicName: "الأنماط الشكلية" },
    { topicId: "quantitative-comparison", topicName: "المقارنة الكمية" },
    { topicId: "word-problems", topicName: "المسائل اللفظية" }
  ]
};

const clampPercent = (value: number) => {
  return Math.min(100, Math.max(0, value));
};

const getLevelLabel = (score: number) => {
  if (score >= 85) {
    return "متقن";
  }

  if (score >= 70) {
    return "متقدم";
  }

  if (score >= 50) {
    return "متطور";
  }

  return "مبتدئ";
};

const formatExamDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ar-SA", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
};

const getTopicRows = (result: ExamResult, subject: ExamCategory) => {
  return officialTopics[subject].map((topic) => {
    return (
      result.topicScores?.find(
        (score) =>
          score.subject === subject && score.topicId === topic.topicId
      ) ?? {
        correctAnswers: 0,
        score: 0,
        subject,
        topicId: topic.topicId,
        topicName: topic.topicName,
        totalQuestions: 0
      }
    );
  });
};

function SubjectTopicCard({
  score,
  title,
  topics
}: {
  score: number;
  title: string;
  topics: ExamTopicScore[];
}) {
  return (
    <article className="exam-completion-topic-card">
      <div className="exam-completion-badge">{score}%</div>
      <h2>{title}</h2>
      <div className="exam-completion-topic-list">
        {topics.map((topic) => (
          <div className="exam-completion-topic-row" key={topic.topicId}>
            <div className="exam-completion-topic-label">
              <span>{topic.topicName}</span>
              <small>
                {topic.correctAnswers} / {topic.totalQuestions}
              </small>
            </div>
            <div
              aria-label={`${topic.topicName}: ${topic.score}%`}
              className="exam-completion-bar"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={topic.score}
            >
              <span style={{ width: `${clampPercent(topic.score)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function ExamResultView({
  onStartNewExam,
  result
}: {
  onStartNewExam: () => void;
  result: ExamResult;
}) {
  const mathTopics = getTopicRows(result, "math");
  const arabicTopics = getTopicRows(result, "arabic");

  return (
    <section className="exam-completion-page" aria-labelledby="exam-result-title">
      <div className="exam-completion-summary">
        <p className="exam-completion-kicker">وهكذا بعد اختبارك:</p>
        <h1 id="exam-result-title">{getLevelLabel(result.finalScore)}</h1>
        <p className="exam-completion-copy">
          هذه قراءة أولية لأدائك في اختبار القدرات. استخدمها لتعرف أين تبدأ
          خطواتك القادمة.
        </p>

        <div className="exam-completion-final-score">
          <span>درجتك التقريبية هي:</span>
          <strong>{result.finalScore}%</strong>
        </div>

        <p className="exam-completion-date">
          تاريخ الاختبار: {formatExamDate(result.createdAt)}
        </p>

        <div className="exam-completion-illustration" aria-hidden="true">
          <span />
        </div>
      </div>

      <div className="exam-completion-cards">
        <SubjectTopicCard
          score={result.mathScore}
          title="كمي"
          topics={mathTopics}
        />
        <SubjectTopicCard
          score={result.arabicScore}
          title="لفظي"
          topics={arabicTopics}
        />

        <section className="exam-completion-sections" aria-labelledby="section-scores-title">
          <h2 id="section-scores-title">درجات الأقسام</h2>
          <div className="exam-completion-section-grid">
            {result.sectionScores.map((score, index) => (
              <div key={index + 1}>
                <span>القسم {index + 1}</span>
                <strong>{score}%</strong>
              </div>
            ))}
          </div>
        </section>

        <button
          className="exam-completion-next-button"
          type="button"
          onClick={onStartNewExam}
        >
          خطواتك التالية
        </button>
      </div>
    </section>
  );
}
