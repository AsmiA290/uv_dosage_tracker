import { pgTable, serial, text, timestamp, doublePrecision, integer, boolean, jsonb } from "drizzle-orm/pg-core";

/**
 * Drizzle schema — Neon/Supabase Postgres.
 * Kept intentionally small per the brief's four-screen scope: a profile,
 * exposure sessions, the dose computed for each, and an optional team
 * roster for a future coach/crew-lead mode.
 */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  fitzpatrickType: text("fitzpatrick_type").notNull(), // "I" | "II" | ... | "VI"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const exposureSessions = pgTable("exposure_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  surface: text("surface").notNull(), // SurfaceType
  posture: text("posture").notNull(), // PostureType
  /** Raw sunscreen application events for this session, as JSON (see lib/dose/types SunscreenApplication[]). */
  sunscreenApplications: jsonb("sunscreen_applications").notNull().default("[]"),
});

export const doseRecords = pgTable("dose_records", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => exposureSessions.id).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  cumulativeDoseSEDNominal: doublePrecision("cumulative_dose_sed_nominal").notNull(),
  cumulativeDoseSEDLow: doublePrecision("cumulative_dose_sed_low").notNull(),
  cumulativeDoseSEDHigh: doublePrecision("cumulative_dose_sed_high").notNull(),
  timeToThresholdP10Minutes: doublePrecision("time_to_threshold_p10_minutes"),
  timeToThresholdP50Minutes: doublePrecision("time_to_threshold_p50_minutes"),
  timeToThresholdP90Minutes: doublePrecision("time_to_threshold_p90_minutes"),
});

/** Optional: coach/crew-lead mode, only if time permits (brief, weeks 4-5). */
export const teamRosters = pgTable("team_rosters", {
  id: serial("id").primaryKey(),
  coachUserId: integer("coach_user_id").references(() => users.id).notNull(),
  memberUserId: integer("member_user_id").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});
