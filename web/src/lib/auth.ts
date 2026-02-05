import { createAuthClient } from "better-auth/react"

import { BASE_URL } from "./constants"

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: {
    credentials: "include",
  },
})

export const { useSession } = authClient
