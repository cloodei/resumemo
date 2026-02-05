import { treaty } from "@elysiajs/eden"
import type { API } from "@api"
import { BASE_URL } from "./constants"

export const api = treaty<API>(BASE_URL, {
  fetch: {
    credentials: "include",
  },
  onResponse: (response) => {
    if (response.status === 401)
      window.location.href = "/login"
  },
})
