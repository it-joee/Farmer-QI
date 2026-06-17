/** Set SKIP_AUTH=true in .env.local to bypass auth checks during development. */
export const SKIP_AUTH = process.env.SKIP_AUTH === "true";

/** Matches db/seed.sql pilot agent — used when SKIP_AUTH is on. */
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000010";
export const DEV_TEAM_LEAD_ID = "00000000-0000-0000-0000-000000000011";
export const DEV_ADMIN_ID = "00000000-0000-0000-0000-000000000012";
export const DEV_OFFICE_ID = "00000000-0000-0000-0000-000000000001";
