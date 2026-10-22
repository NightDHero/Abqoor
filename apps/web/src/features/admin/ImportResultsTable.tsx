import { Fragment, useEffect, useMemo, useState } from "react";
import type { ImportJobDetail, ImportJobItem } from "../../types/admin";
import { answerLabel } from "./adminUtils";

const optionLabels = ["أ", "ب", "ج", "د"];
const outcomeLabels = {
  pending: "بانتظار التأكيد",
  created: "مضاف",
  replaced: "مستبدل",
  skipped: "متخطى",
  failed: "فشل"
} as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const asText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

const asTextList = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => asText(item)).filter((item): item is string => Boolean(item))
    : [];

const sourceIdentifiers = (item: ImportJobItem) => {
  const identifiers = asRecord(item.metadata.sourceIdentifiers);
  return identifiers
    ? ["primary", "secondary", "code"]
        .map((key, index) => {
          const value = asText(identifiers[key]);
          return value ? `${String.fromCharCode(65 + index)}: ${value}` : null;
        })
        .filter((value): value is string => Boolean(value))
    : [];
};

const sourceColumns = (item: ImportJobItem) =>
  Array.isArray(item.metadata.sourceColumns) ? item.metadata.sourceColumns : [];

function ImportResultDetails({ item }: { item: ImportJobItem }) {
  const comparisons = asTextList(item.metadata.comparisonOperands);
  const comparisonImages = asTextList(
    item.metadata.comparisonImageValues ?? item.metadata.comparisonImages
  );
  const additionalCategory = asText(item.metadata.additionalCategory);
  const imageIndicator = asText(item.metadata.imageIndicator);
  const sourceAnswer = asText(item.metadata.sourceCorrectAnswer);
  const passage = asText(item.metadata.passage);
  const passageId = asText(item.metadata.passageId);
  const identifiers = sourceIdentifiers(item);

  return (
    <div className="admin-import-result-details">
      <dl>
        <div><dt>نص السؤال</dt><dd>{item.questionText || "غير متوفر"}</dd></div>
        <div><dt>معرّفات المصدر A–C</dt><dd dir="ltr">{identifiers.join(" · ") || "غير متوفرة"}</dd></div>
        <div><dt>المصدر الأصلي</dt><dd>{item.sheetName} · صف Excel {item.excelRowNumber.toLocaleString("ar-SA")}</dd></div>
        <div><dt>الصعوبة</dt><dd>{item.difficulty.toLocaleString("ar-SA")}</dd></div>
        <div><dt>الفئة الإضافية</dt><dd>{additionalCategory ?? "غير محددة"}</dd></div>
        <div><dt>مؤشر الصورة/الرسم</dt><dd>{imageIndicator ?? "غير محدد"}</dd></div>
        <div><dt>المقارنة أ</dt><dd>{comparisons[0] ?? "غير مطبقة"}</dd></div>
        <div><dt>المقارنة ب</dt><dd>{comparisons[1] ?? "غير مطبقة"}</dd></div>
        <div><dt>صور المقارنة</dt><dd>{comparisonImages.join(" · ") || "غير مطبقة"}</dd></div>
        <div><dt>الإجابة الأصلية / المعيارية</dt><dd>{sourceAnswer ?? "تظهر ضمن الأعمدة الخام"} / {answerLabel(item.correctAnswer)}</dd></div>
        {passage || passageId ? <div><dt>علاقة القطعة المقروءة</dt><dd>{passageId ?? "بدون معرّف"}{passage ? ` · ${passage}` : ""}</dd></div> : null}
      </dl>
      <div className="admin-import-result-options" aria-label="خيارات الإجابة">
        {item.options.map((option, index) => (
          <span key={`${item.questionId}-option-${index}`}><b>{optionLabels[index]}</b>{option || "فارغ"}</span>
        ))}
      </div>
      {item.errors.length > 0 ? (
        <ul className="admin-import-result-warnings">
          {item.errors.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}
        </ul>
      ) : null}
      <details className="admin-import-source-columns">
        <summary>القيم الأصلية المستخرجة من Excel</summary>
        <pre dir="ltr">{JSON.stringify(sourceColumns(item), null, 2)}</pre>
      </details>
    </div>
  );
}

export function ImportResultsTable({
  detail,
  title = "نتائج الأسئلة"
}: {
  detail: ImportJobDetail;
  title?: string;
}) {
  const pageSize = 25;
  const [page, setPage] = useState(1);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(detail.items.length / pageSize));
  const items = useMemo(
    () => detail.items.slice((page - 1) * pageSize, page * pageSize),
    [detail.items, page]
  );

  useEffect(() => {
    setPage(1);
    setExpandedQuestionId(null);
  }, [detail.job.id]);

  return (
    <section className="admin-panel admin-import-results">
      <header className="admin-panel-heading">
        <div><h2>{title}</h2><p>بيانات الخادم المحفوظة، بواقع {pageSize.toLocaleString("ar-SA")} سؤالاً في الصفحة.</p></div>
      </header>
      <div className="admin-table-wrap">
        <table className="admin-table admin-import-results-table">
          <thead><tr><th>السؤال والمعرّفات</th><th>المصدر</th><th>القسم</th><th>الموضوع الرئيسي</th><th>الموضوع الفرعي</th><th>الإجابة</th><th>الحالة</th><th>التفاصيل</th></tr></thead>
          <tbody>
            {items.map((item) => {
              const expanded = expandedQuestionId === item.questionId;
              const identifiers = sourceIdentifiers(item);
              return (
                <Fragment key={item.questionId}>
                  <tr>
                    <td><b>{item.questionNumber.toLocaleString("ar-SA")}</b>{identifiers.length ? <small dir="ltr">{identifiers.join(" · ")}</small> : null}</td>
                    <td>{item.pageNumber ? `PDF ${item.pageNumber.toLocaleString("ar-SA")}` : item.sourceImageName ?? "بدون وسيط"}<small>{item.sheetName} · صف {item.excelRowNumber.toLocaleString("ar-SA")}</small></td>
                    <td>{item.subject === "quantitative" ? "كمي" : "لفظي"}</td>
                    <td>{item.topic || "غير محدد"}</td>
                    <td>{item.subtopic ?? "غير معيّن"}</td>
                    <td>{answerLabel(item.correctAnswer)}</td>
                    <td><b data-valid={item.validationStatus === "valid"}>{item.validationStatus === "valid" ? outcomeLabels[item.outcome] : item.errors[0]?.message ?? "خطأ تحقق"}</b></td>
                    <td><button aria-expanded={expanded} className="secondary admin-result-detail-toggle" type="button" onClick={() => setExpandedQuestionId(expanded ? null : item.questionId)}>{expanded ? "إغلاق" : "عرض"}</button></td>
                  </tr>
                  {expanded ? <tr className="admin-import-result-expanded"><td colSpan={8}><ImportResultDetails item={item} /></td></tr> : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? <nav className="admin-pagination" aria-label="صفحات نتائج الأسئلة"><button className="secondary" disabled={page === 1} type="button" onClick={() => setPage((value) => value - 1)}>السابق</button><span>{page.toLocaleString("ar-SA")} / {pageCount.toLocaleString("ar-SA")}</span><button className="secondary" disabled={page === pageCount} type="button" onClick={() => setPage((value) => value + 1)}>التالي</button></nav> : null}
    </section>
  );
}
