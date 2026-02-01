import { treaty } from "@elysiajs/eden"
import type { API } from "@api"

const baseURL = import.meta.env.VITE_AUTH_SERVER_URL ?? "http://localhost:8080"

export const api = treaty<API>(baseURL, {
  fetch: {
    credentials: "include",
  },
  onResponse: (response) => {
    if (response.status === 401) {
      // Redirect to login on any 401 response
      window.location.href = "/login"
    }
  },
})
