export type RuntimeMode = "mock" | "live" | "unconfigured";

export interface ServerConfig {
  mode: RuntimeMode;
  apiKey: string | null;
  baseUrl: string;
  model: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() ? value.trim() : undefined;
}

/** 裁决：显式 MOCK_LLM=true → mock；否则有密钥 → live；否则 unconfigured */
export function getServerConfig(): ServerConfig {
  const mockRaw = (readEnv("MOCK_LLM") ?? "").toLowerCase();
  const mockExplicit = mockRaw === "true" || mockRaw === "1" || mockRaw === "yes";
  const apiKey = readEnv("LLM_API_KEY") ?? null;
  const baseUrl = readEnv("LLM_BASE_URL") ?? "https://api.deepseek.com";
  const model = readEnv("LLM_MODEL") ?? "deepseek-chat";

  if (mockExplicit) {
    return { mode: "mock", apiKey, baseUrl, model };
  }
  if (apiKey) {
    return { mode: "live", apiKey, baseUrl, model };
  }
  return { mode: "unconfigured", apiKey: null, baseUrl, model };
}
