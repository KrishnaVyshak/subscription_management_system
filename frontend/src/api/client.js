import axios from 'axios';

// All business data goes through Express; the browser talks to Supabase only for auth.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

// Phase 1: request interceptor adds `Authorization: Bearer <access_token>`;
// response interceptor signs out and redirects to /login on 401.
