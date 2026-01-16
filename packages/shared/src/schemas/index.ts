import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserSchema = z.infer<typeof userSchema>;
