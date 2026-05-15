import { httpClient as axios } from "../http/client";
import type { AuthUser } from "./types";

export async function authMe(): Promise<AuthUser> {
  const { data } = await axios.get<AuthUser>("/api/auth/me");
  return data;
}

export async function authLogin(payload: { email: string; password: string; remember?: boolean }): Promise<AuthUser> {
  const { data } = await axios.post<AuthUser>("/api/auth/login", payload);
  return data;
}

export async function authLogout(): Promise<void> {
  await axios.post("/api/auth/logout");
}

