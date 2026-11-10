import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeThemePreference } from "./theme/theme";
import { prepareApplicationCache } from "./services/applicationCache";
import { preloadRouteCode } from "./services/routePreload";
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
import "./features/auth/auth-page.css";
import "./readiness-polish.css";

initializeThemePreference();
void prepareApplicationCache();
void preloadRouteCode(window.location.pathname).catch(() => undefined);

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
