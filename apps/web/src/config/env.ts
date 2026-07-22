const viteEnv = import.meta.env;

export const env = {
  apiUrl: viteEnv?.VITE_API_URL ?? "http://localhost:4000"
};
