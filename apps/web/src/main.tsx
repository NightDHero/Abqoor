import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./public-home.css";
import "./product-design.css";
import "./features/career/hub.css";
import "./features/topic-world/topic-directory.css";
import "./components/layout/app-navigation.css";
import "./features/browser/solving-workspace.css";
import "./components/ui/immersive-question-feed.css";
import "./experience-system.css";
import "./features/exam/exam-entry.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
