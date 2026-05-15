export type AuthUser = {
  id: number;
  name: string;
  email: string;
  is_superadmin: boolean;
  tenant_id?: number | null;
  branch_id?: number | null;
  role_slug?: string | null;
  role_name?: string | null;
  permissions?: string[];
  area_ids?: number[];
  phone?: string | null;
  is_active?: boolean;
  cargo_id?: number | null;
  cost_per_hour?: string | number | null;
};

declare global {
  interface Window {
    __AUTH__?: AuthUser | null;
  }
}
