import { httpClient as axios } from "../http/client";
import type { LaravelPaginated } from "../xpande/http";

export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  is_superadmin: boolean;
  role_id?: number | null;
  cargo_id?: number | null;
  phone?: string | null;
  is_active?: boolean;
  contract_type?: string | null;
  salary?: string | null;
  cost_per_hour?: string | null;
  availability?: string | null;
  specialty?: string | null;
  role?: { id: number; name: string; slug: string };
  cargo?: { id: number; name: string };
  areas?: { id: number; name: string }[];
  created_at?: string;
};

const p = "/api/users";

export type UsersListParams = {
  page?: number;
  q?: string;
  scope?: "all" | "admins" | "users";
  sort?: "id" | "name" | "email" | "created_at";
  dir?: "asc" | "desc";
  per_page?: number;
};

export async function fetchUsersPage(params: UsersListParams | number = {}, maybeQ = ""): Promise<LaravelPaginated<ManagedUser>> {
  const opts: UsersListParams = typeof params === "number"
    ? { page: params, q: typeof maybeQ === "string" ? maybeQ : "" }
    : params;
  const { data } = await axios.get<LaravelPaginated<ManagedUser>>(p, {
    params: {
      page: opts.page ?? 1,
      q: opts.q?.trim() || undefined,
      scope: opts.scope && opts.scope !== "all" ? opts.scope : undefined,
      sort: opts.sort ?? "id",
      dir: opts.dir ?? "desc",
      per_page: opts.per_page ?? 50,
    },
  });
  return data;
}

export async function fetchUser(id: number): Promise<ManagedUser> {
  const { data } = await axios.get<ManagedUser>(`${p}/${id}`);
  return data;
}

export async function createUser(payload: Record<string, unknown>): Promise<ManagedUser> {
  const { data } = await axios.post<ManagedUser>(p, payload);
  return data;
}

export async function updateUser(id: number, payload: Record<string, unknown>): Promise<ManagedUser> {
  const { data } = await axios.put<ManagedUser>(`${p}/${id}`, payload);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await axios.delete(`${p}/${id}`);
}
