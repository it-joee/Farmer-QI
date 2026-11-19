import { query } from "../db.js";

let usersSchemaReadyPromise: Promise<void> | null = null;

/** Ensures users table supports the `operations` role and `can_access_operations` flag. */
export async function ensureUsersOperationsSupport(): Promise<void> {
  if (!usersSchemaReadyPromise) {
    usersSchemaReadyPromise = (async () => {
      await query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS can_access_operations boolean NOT NULL DEFAULT false`
      );

      try {
        await query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operations'`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("does not exist")) {
          console.warn("[users schema] could not extend user_role enum:", message);
        }
      }

      try {
        const checkRes = await query<{ exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
           ) AS exists`
        );
        if (checkRes.rows[0]?.exists) {
          await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
          await query(
            `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('agent', 'team_lead', 'operations', 'admin'))`
          );
        }
      } catch (err) {
        console.warn(
          "[users schema] could not update users_role_check:",
          err instanceof Error ? err.message : String(err)
        );
      }
    })().catch((err) => {
      usersSchemaReadyPromise = null;
      throw err;
    });
  }
  return usersSchemaReadyPromise;
}
