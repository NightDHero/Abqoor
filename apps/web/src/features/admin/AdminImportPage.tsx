import { FormEvent, useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { adminService } from "../../services/adminService";
import { HttpError } from "../../services/http";
import type { ImportManifestItem, ImportMode } from "../../types/admin";

export function AdminImportPage() {
  const [pdf, setPdf] = useState<File | null>(null);
  const [excel, setExcel] = useState<File | null>(null);
  const [startQuestionNumber, setStartQuestionNumber] = useState("1");
  const [mode, setMode] = useState<ImportMode>("preview");
  const [pageRangeFrom, setPageRangeFrom] = useState("");
  const [pageRangeTo, setPageRangeTo] = useState("");
  const [manifest, setManifest] = useState<ImportManifestItem[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setManifest([]);

    if (!pdf || !excel) {
      setError("ملف PDF وملف Excel مطلوبان.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await adminService.importPdfQuestions({
        excel,
        mode,
        pageRangeFrom,
        pageRangeTo,
        pdf,
        startQuestionNumber
      });
      setManifest(response.manifest);
      setMessage(
        `تم تنفيذ الطلب. ناجح: ${response.importJob.successCount}، فاشل: ${response.importJob.failureCount}`
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof HttpError
          ? caughtError.message
          : "تعذر تنفيذ الاستيراد."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      description="أداة إدارية لاستيراد PDF مع Excel. بقيت متاحة حتى لا تتعطل مسارات الإدارة أثناء تأسيس الواجهة."
      eyebrow="إدارة"
      title="استيراد الأسئلة"
    >
      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="form-field">
            ملف PDF
            <input
              accept="application/pdf"
              required
              type="file"
              onChange={(event) => setPdf(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="form-field">
            ملف Excel
            <input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              type="file"
              onChange={(event) => setExcel(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            رقم البداية
            <input
              min="1"
              required
              type="number"
              value={startQuestionNumber}
              onChange={(event) => setStartQuestionNumber(event.target.value)}
            />
          </label>
          <label className="form-field">
            من صفحة
            <input
              min="1"
              type="number"
              value={pageRangeFrom}
              onChange={(event) => setPageRangeFrom(event.target.value)}
            />
          </label>
          <label className="form-field">
            إلى صفحة
            <input
              min="1"
              type="number"
              value={pageRangeTo}
              onChange={(event) => setPageRangeTo(event.target.value)}
            />
          </label>
        </div>

        <fieldset className="radio-group">
          <legend>النمط</legend>
          <label className="radio-label">
            <input
              checked={mode === "preview"}
              name="mode"
              type="radio"
              onChange={() => setMode("preview")}
            />
            معاينة
          </label>
          <label className="radio-label">
            <input
              checked={mode === "commit"}
              name="mode"
              type="radio"
              onChange={() => setMode("commit")}
            />
            حفظ
          </label>
        </fieldset>

        {error ? <p className="error-message">{error}</p> : null}
        {message ? <p className="status-message">{message}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جاري التنفيذ..." : "تشغيل الاستيراد"}
        </button>
      </form>

      {manifest.length > 0 ? (
        <div className="manifest-list" aria-label="نتيجة الاستيراد">
          {manifest.map((item) => (
            <div className="manifest-item" key={`${item.questionId}-${item.pageIndex}`}>
              <strong dir="ltr">{item.questionId}</strong>
              <span>{item.imageUrl}</span>
              <span>صفحة {item.pageIndex}</span>
              <span>الحالة: {item.status}</span>
              {item.error ? <span>{item.error}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </PageContainer>
  );
}
