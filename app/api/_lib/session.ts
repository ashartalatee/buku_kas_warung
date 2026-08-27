// Copy this file to: app/api/_lib/session.ts
//
// Phase 1 (per SPEC.md §7) is single-OWNER only — there is no real
// multi-user auth yet. This stub centralizes "who is making this
// request" in one place so that when real auth is added later
// (NextAuth, Clerk, etc.), only this file needs to change — every
// route handler already calls getCurrentUser() rather than hardcoding
// a name.

export interface CurrentUser {
  business_id: string;
  user_identifier: string; // e.g. email or WA number; stored as created_by/performed_by
  role: "OWNER"; // Phase 1 has no other role in practice
}

export function getCurrentUser(): CurrentUser {
  // TODO: replace with real session lookup once multi-user is needed.
  // For a single-tenant pilot, these can come from env vars for now.
  return {
    business_id: process.env.TALATEE_PILOT_BUSINESS_ID ?? "REPLACE_WITH_REAL_BUSINESS_ID",
    user_identifier: process.env.TALATEE_PILOT_OWNER_ID ?? "owner",
    role: "OWNER",
  };
}
