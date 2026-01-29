import * as schema from "../schemas/index";

export type User = typeof schema.user.$inferSelect;
export type Session = typeof schema.session.$inferSelect;
export type Account = typeof schema.account.$inferSelect;
export type Verification = typeof schema.verification.$inferSelect;
