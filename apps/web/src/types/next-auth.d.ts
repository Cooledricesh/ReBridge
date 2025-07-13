import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isRegisteredDisability: boolean
    } & DefaultSession["user"]
  }

  interface User {
    isRegisteredDisability: boolean
  }
}