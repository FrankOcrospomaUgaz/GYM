import type { AxiosError } from "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    skipGlobalErrorHandler?: boolean;
    errorTitle?: string;
  }
}

export type ParsedApiError = {
  sessionExpired: boolean;
  title: string;
  message: string;
  details: string[];
};

type HttpErrorHandlers = {
  onSessionExpired: () => void;
  onApiError: (error: unknown, title: string) => void;
};

let handlers: HttpErrorHandlers | null = null;

export function registerHttpErrorHandlers(next: HttpErrorHandlers | null) {
  handlers = next;
}

export function parseApiError(error: unknown, title = "No se pudo completar la operación"): ParsedApiError {
  const response = (error as AxiosError<{ message?: string; errors?: Record<string, string[] | string> }>)?.response;
  const status = response?.status;
  const data = response?.data ?? {};

  if (status === 401 || status === 419) {
    return {
      sessionExpired: true,
      title: "Sesión expirada",
      message:
        status === 419
          ? "La sesión o el token de seguridad expiró. En unos segundos te llevaremos al inicio de sesión."
          : "Tu sesión ya no es válida. En unos segundos te llevaremos al inicio de sesión.",
      details: [],
    };
  }

  const fieldLabels: Record<string, string> = {
    member_id: "Socio",
    product_id: "Producto",
    discipline: "Disciplina",
    monthly_fee: "Mensualidad",
    starts_on: "Fecha de inicio",
    selected_days: "Días de entrenamiento",
    day_schedules: "Horarios",
    payment_method: "Medio de pago",
    proof_photo: "Foto del comprobante",
    sessions_per_week: "Sesiones por semana",
    schedule_mode: "Tipo de configuración",
    week_schedules: "Horarios por semana",
  };

  const details = Object.entries(data.errors ?? {}).flatMap(([field, messages]) => {
    const label = fieldLabels[field] ?? field;
    const list = Array.isArray(messages) ? messages : [messages];
    return list.map((message) => `${label}: ${String(message)}`);
  });

  if (details.length > 0) {
    return {
      sessionExpired: false,
      title,
      message: "Hay datos pendientes o inválidos. Revisa el detalle e intenta de nuevo.",
      details,
    };
  }

  const rawMessage = String(data.message ?? "");
  if (rawMessage) {
    return { sessionExpired: false, title, message: rawMessage, details: [] };
  }

  if (status === 413) {
    return {
      sessionExpired: false,
      title,
      message: "El archivo enviado es demasiado pesado. Usa una imagen más liviana.",
      details: [],
    };
  }

  if (status === 422) {
    return {
      sessionExpired: false,
      title,
      message: "No se pudo procesar la solicitud. Verifica los datos e intenta nuevamente.",
      details: [],
    };
  }

  return {
    sessionExpired: false,
    title,
    message: "Ocurrió un problema inesperado. Revisa tu conexión e intenta nuevamente.",
    details: [],
  };
}

export function dispatchHttpError(error: unknown) {
  if (!handlers) return;

  const config = (error as AxiosError)?.config;
  const status = (error as AxiosError)?.response?.status;
  const sessionExpired = status === 401 || status === 419;

  if (config?.skipGlobalErrorHandler && !sessionExpired) return;

  const parsed = parseApiError(error);
  if (parsed.sessionExpired) {
    handlers.onSessionExpired();
    return;
  }

  if (config?.skipGlobalErrorHandler) return;

  const method = String(config?.method ?? "get").toLowerCase();
  if (!["post", "put", "patch", "delete"].includes(method)) return;

  const title = String(config?.errorTitle ?? "No se pudo completar la operación");
  handlers.onApiError(error, title);
}
