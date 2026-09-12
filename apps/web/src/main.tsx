import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeThemePreference } from "./theme/theme";
import "./styles.css";
import "./public-home.css";
import "./product-design.css";
import "./features/career/hub.css";
import "./features/topic-world/topic-directory.css";
import "./features/browser/solving-workspace.css";
import "./components/ui/immersive-question-feed.css";
import "./experience-system.css";
import "./features/exam/exam-entry.css";
import "./features/admin/admin-question-management.css";
import "./theme.css";
import "./components/layout/app-navigation.css";

initializeThemePreference();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
