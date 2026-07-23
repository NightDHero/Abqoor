import type { ReactNode } from "react";
import { HubReturnControl } from "./HubReturnControl";

export function AppShell({
  children,
  currentPath
}: {
  children: ReactNode;
  currentPath: string;
}) {
  const isCareerExperience = currentPath === "/career";
  const isExamExperience = currentPath === "/exam";
  const isTopicDirectoryExperience = currentPath.startsWith("/topic/");
  const shellClassName = [
    "app-shell",
    isCareerExperience ? "career-app-shell" : "",
    !isCareerExperience ? "focused-app-shell" : "",
    isExamExperience ? "exam-entry-app-shell" : "",
    isTopicDirectoryExperience ? "topic-directory-app-shell" : "",
    !isCareerExperience && !isExamExperience
      ? "product-app-shell"
      : ""
  ]
    .filter(Boolean)
    .join(" ");
  const mainClassName = [
    "app-main",
    isCareerExperience ? "career-app-main" : "",
    isTopicDirectoryExperience ? "topic-directory-app-main" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} dir="rtl">
      {!isCareerExperience ? <HubReturnControl /> : null}
      <main className={mainClassName}>{children}</main>
    </div>
  );
}
