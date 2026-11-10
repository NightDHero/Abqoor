import { useEffect, useState } from "react";
import { startPerformanceInteraction } from "../services/performanceTelemetry";
import { getCurrentPath } from "../utils/router";

export const useRouter = () => {
  const [path, setPath] = useState(getCurrentPath);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const nextPath = getCurrentPath();
      if (!event.state?.abqoorProgrammatic) {
        startPerformanceInteraction("navigation", nextPath);
      }
      setPath(nextPath);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return { path };
};
