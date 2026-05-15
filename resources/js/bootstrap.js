import { httpClient } from './http/client';

window.axios = httpClient;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;

window.axios.interceptors.request.use((config) => {
  const csrf = document.querySelector('meta[name="csrf-token"]');
  if (csrf) {
    config.headers['X-CSRF-TOKEN'] = csrf.getAttribute('content');
  }
  return config;
});
