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
  const isLearningWorldExperience = currentPath.startsWith("/topic/");
  const shellClassName = [
    "app-shell",
    isCareerExperience ? "career-app-shell" : "",
    !isCareerExperience ? "focused-app-shell" : "",
    isExamExperience ? "exam-entry-app-shell" : "",
    isLearningWorldExperience ? "learning-world-app-shell" : "",
    !isCareerExperience && !isExamExperience && !isLearningWorldExperience
      ? "product-app-shell"
      : ""
  ]
    .filter(Boolean)
    .join(" ");
  const mainClassName = [
    "app-main",
    isCareerExperience ? "career-app-main" : "",
    isLearningWorldExperience ? "learning-world-app-main" : ""
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
