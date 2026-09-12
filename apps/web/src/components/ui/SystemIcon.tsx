import type { ReactNode } from "react";

export type SystemIconName =
  | "back"
  | "bank"
  | "calendar"
  | "check"
  | "clock"
  | "history"
  | "lock"
  | "question"
  | "status"
  | "upload"
  | "users";

const iconPaths: Record<SystemIconName, ReactNode> = {
  back: (
    <>
      <path d="M15 6 9 12l6 6" />
      <path d="M9 12h11" />
    </>
  ),
  bank: (
    <>
      <path d="M4 9.5 12 5l8 4.5" />
      <path d="M6 10.5h12" />
      <path d="M7 10.5V18" />
      <path d="M12 10.5V18" />
      <path d="M17 10.5V18" />
      <path d="M5 18h14" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 3.5v3" />
      <path d="M17 3.5v3" />
      <path d="M4.5 8.5h15" />
      <path d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
      <path d="M8 16h.01" />
      <path d="M12 16h.01" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4.2 4.2L19 6.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  history: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 5.5v4h4" />
      <path d="M12 8v4l2.5 1.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <path d="M12 14v2" />
    </>
  ),
  question: (
    <>
      <path d="M8.5 9a3.5 3.5 0 1 1 5.9 2.55c-.95.83-1.75 1.42-1.9 2.95" />
      <path d="M12 18h.01" />
      <circle cx="12" cy="12" r="8.5" />
    </>
  ),
  status: (
    <>
      <path d="M5 17V9" />
      <path d="M12 17V5" />
      <path d="M19 17v-6" />
      <path d="M4 19.5h16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4.5" />
      <path d="m7.5 9 4.5-4.5L16.5 9" />
      <path d="M5 15v2.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.8 18a5.2 5.2 0 0 1 10.4 0" />
      <path d="M16 11a2.6 2.6 0 0 0 0-5" />
      <path d="M16.5 14.5A4.2 4.2 0 0 1 20.2 18" />
    </>
  )
};

export function SystemIcon({
  className,
  name
}: {
  className?: string;
  name: SystemIconName;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {iconPaths[name]}
    </svg>
  );
}
