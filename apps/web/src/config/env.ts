const viteEnv = import.meta.env;

const normalizeUrl = (value: string | undefined, fallback: string) => {
  const url = value?.trim() || fallback;
  return url.replace(/\/+$/, "");
};

export const env = {
  apiUrl: normalizeUrl(viteEnv?.VITE_API_URL, "http://localhost:4000")
};
