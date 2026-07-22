import { useEffect, useState } from "react";
import { getCurrentPath } from "../utils/router";

export const useRouter = () => {
  const [path, setPath] = useState(getCurrentPath);

  useEffect(() => {
    const handlePopState = () => setPath(getCurrentPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return { path };
};
