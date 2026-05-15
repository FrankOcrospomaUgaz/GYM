import axios from "axios";

/**
 * Axios + Laravel: debe enviar CSRF usando la cookie cifrada `XSRF-TOKEN`.
 * Si además mandamos `X-CSRF-TOKEN` desde el meta de la SPA, Laravel lo PRIORIZA primero:
 * HTML cacheado/viejo o sesión nueva deja ese valor viejo → 419 con cookie válida pero meta vieja.
 * @see https://github.com/laravel/framework/blob/master/src/Illuminate/Foundation/Http/Middleware/VerifyCsrfToken.php
 */
export const httpClient = axios.create({
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});
