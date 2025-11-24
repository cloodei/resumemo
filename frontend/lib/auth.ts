import { createAuthClient } from "better-auth/react"
import { emailOTPClient } from "better-auth/client/plugins"

import { baseURL } from "./utils"

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [emailOTPClient()],
})

export const { useSession } = authClient
