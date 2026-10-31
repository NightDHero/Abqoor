import { startTransition, useEffect, useState } from "react";
import { getCurrentPath } from "../utils/router";

export const useRouter = () => {
  const [path, setPath] = useState(getCurrentPath);

  useEffect(() => {
    const handlePopState = () => {
      startTransition(() => setPath(getCurrentPath()));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return { path };
};
