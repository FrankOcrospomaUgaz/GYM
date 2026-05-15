import axios from "axios";

export function apiErrorMessage(e: unknown, fallback: string): string {
  if (!axios.isAxiosError(e)) {
    return fallback;
  }
  const data = e.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (data?.errors && typeof data.errors === "object") {
    const lines = Object.values(data.errors)
      .flat()
      .filter((x) => typeof x === "string");
    if (lines.length > 0) {
      return lines.join(" ");
    }
  }
  return fallback;
}
