import { useEffect } from "react";
import { navigateTo } from "../../utils/router";

export function RedirectTo({ path }: { path: string }) {
  useEffect(() => {
    navigateTo(path);
  }, [path]);

  return null;
}
