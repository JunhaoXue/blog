import type { BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { database } from "./database";

if (
  !process.env.BETTER_AUTH_SECRET ||
  process.env.BETTER_AUTH_SECRET.length < 32
) {
  throw new Error(
    "BETTER_AUTH_SECRET must contain at least 32 characters. Run npm run setup first.",
  );
}

export const authOptions = {
  appName: "Junhao Xue Blog",
  database,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, minPasswordLength: 12 },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "reader", input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;
