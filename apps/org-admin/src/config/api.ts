export const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_URL as string) ||
  ((import.meta as any).env?.PROD
    ? 'https://restuarants-api.vercel.app/api/v1'
    : 'http://localhost:4000/api/v1');
