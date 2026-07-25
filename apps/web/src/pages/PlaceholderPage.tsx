import { PageContainer } from "../components/layout/PageContainer";

export function PlaceholderPage({
  description,
  eyebrow,
  title
}: {
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <PageContainer description={description} eyebrow={eyebrow} title={title}>
      <div className="placeholder-grid">
        <div className="placeholder-card">
          هذه الصفحة محجوزة في أساس الواجهة فقط. سيتم تنفيذ المحتوى الفعلي في
          مرحلته المحددة.
        </div>
      </div>
    </PageContainer>
  );
}
