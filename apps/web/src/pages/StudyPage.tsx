import { StudyMode } from "../features/study/StudyMode";

export function StudyPage() {
  const params = new URLSearchParams(window.location.search);
  const subject = params.get("subject");
  const subjectId =
    subject === "math" || subject === "arabic" ? subject : undefined;
  const planDate = params.get("planDate") ?? undefined;

  return <StudyMode planDate={planDate} subjectId={subjectId} />;
}
