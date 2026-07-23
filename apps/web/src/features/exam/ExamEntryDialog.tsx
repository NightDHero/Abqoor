import { useEffect, useState } from "react";
import { examService } from "../../services/examService";
import type { ExamResult } from "../../types/exam";

const instructionItems = [
  "الغش أو الشروع فيه أو محاولة ذلك، أو الإخلال بسير الاختبارات، يعرضك لاتخاذ الإجراء النظامي.",
  "يمنع اصطحاب الهاتف المحمول أثناء الاختبار أو إخراجه أثناء الاختبار لأي غرض، وإخراجه أثناء الاختبار يعرضك لاتخاذ الإجراء النظامي.",
  "على الطالب إنهاء القسم السابق خلال الوقت المحدد (٢٥) دقيقة، ولن يستطيع الإجابة على أي أسئلة بعد انتهاء الزمن المحدد.",
  "نظام الاختبارات يحسب للطالب الدرجة الأعلى من محاولاته.",
  "لا يسمح باستخدام جهاز الحاسب الآلي للغش بأي شكل من الأشكال في الاختبار.",
  "جميع قواعد الاختبارات التقليدية تنطبق على الاختبارات الإلكترونية."
];

const formatScore = (score: number) => `${Math.round(score)}%`;

const formatDate = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    year: "numeric"
  });
};

export function ExamEntryDialog({
  displayMode = "overlay",
  onStart
}: {
  displayMode?: "overlay" | "page";
  onStart: () => void;
}) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);

  useEffect(() => {
    if (!isLaunching) {
      return;
    }

    const timeoutId = window.setTimeout(onStart, 260);
    return () => window.clearTimeout(timeoutId);
  }, [isLaunching, onStart]);

  useEffect(() => {
    let isMounted = true;

    void examService
      .getHistory()
      .then((response) => {
        if (isMounted) {
          setExamHistory(response.examResults.slice(0, 3));
        }
      })
      .catch(() => {
        if (isMounted) {
          setExamHistory([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section
      aria-labelledby="exam-entry-title"
      aria-modal={displayMode === "overlay" ? true : undefined}
      className={
        displayMode === "overlay"
          ? `exam-entry-overlay${isLaunching ? " launching" : ""}`
          : "exam-entry-page"
      }
      role={displayMode === "overlay" ? "dialog" : undefined}
    >
      <div className="exam-entry-layout">
        <section className="exam-entry-history" aria-labelledby="exam-history-title">
          <h2 id="exam-history-title">محاولاتك الماضية</h2>
          <div className="exam-entry-history-grid" role="table" aria-label="محاولاتك السابقة">
            <div className="exam-entry-history-header" role="row">
              <span role="columnheader">النسبة الكلية</span>
              <span role="columnheader">نسبة الكمي</span>
              <span role="columnheader">نسبة اللفظي</span>
              <span role="columnheader">نوع الاختبار</span>
              <span role="columnheader">تاريخ تقديم الاختبار</span>
            </div>
            {examHistory.length > 0 ? (
              examHistory.map((attempt) => (
                <div className="exam-entry-history-row" role="row" key={attempt.id}>
                  <span role="cell">{formatScore(attempt.finalScore)}</span>
                  <span role="cell">{formatScore(attempt.mathScore)}</span>
                  <span role="cell">{formatScore(attempt.arabicScore)}</span>
                  <span className="exam-entry-type-pill" role="cell">
                    كامل
                  </span>
                  <span dir="ltr" role="cell">
                    {formatDate(attempt.createdAt ?? attempt.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <div className="exam-entry-history-empty">
                لا توجد محاولات سابقة حتى الآن
              </div>
            )}
          </div>
        </section>

        <section
          className="exam-entry-instructions"
          aria-labelledby="exam-entry-title"
        >
          <h1 id="exam-entry-title">تعليمات الاختبار</h1>
          <ol className="exam-entry-instruction-list">
            {instructionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="exam-entry-goodluck">مع خالص دعواتنا بالتوفيق...</p>
          <button
            className="exam-entry-start"
            type="button"
            disabled={isLaunching}
            onClick={() => setIsLaunching(true)}
          >
            {isLaunching ? "جاري الدخول..." : "بدء الاختبار"}
          </button>
        </section>
      </div>
    </section>
  );
}
