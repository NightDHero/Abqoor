import { ExamMode } from "../features/exam/ExamMode";

export function ExamPage({
  autoStart,
  onAutoStartConsumed,
  onExit,
  userEmail
}: {
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  onExit: () => void;
  userEmail?: string;
}) {
  return (
    <ExamMode
      autoStart={autoStart}
      onAutoStartConsumed={onAutoStartConsumed}
      onExit={onExit}
      userEmail={userEmail}
    />
  );
}
