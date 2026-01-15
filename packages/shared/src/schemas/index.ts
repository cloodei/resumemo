import { z } from "zod";

// Example user schema - add your shared schemas here
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserSchema = z.infer<typeof userSchema>;

// Add more shared schemas as needed
