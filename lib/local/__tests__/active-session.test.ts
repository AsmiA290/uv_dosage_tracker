import { describe, expect, it } from "vitest";
import { deserializeSession, serializeSession, type InProgressSession } from "../active-session";

const session: InProgressSession = {
  id: "abc",
  startedAt: new Date("2026-07-15T17:00:00Z"),
  setup: { fitzpatrickType: "II", surface: "grass", posture: "activeSport", spf: "30", thickness: 1.0 },
  applications: [
    { appliedAt: new Date("2026-07-15T17:00:00Z"), labeledSPF: 30, appliedThicknessMgCm2: 1.0, wearCondition: "dry" },
  ],
  note: "practice",
  priorDose: { low: 0.4, nominal: 0.5, high: 0.6 },
  location: { latitude: 39.78, longitude: -89.65, label: "Springfield, IL" },
};

describe("in-progress session persistence", () => {
  it("round-trips a running session, restoring real Date objects", () => {
    const restored = deserializeSession(serializeSession(session));
    expect(restored).not.toBeNull();
    expect(restored!.startedAt).toBeInstanceOf(Date);
    expect(restored!.startedAt.toISOString()).toBe("2026-07-15T17:00:00.000Z");
    expect(restored!.applications[0]!.appliedAt).toBeInstanceOf(Date);
    expect(restored!.endedAt).toBeUndefined();
    expect(restored!.location.label).toBe("Springfield, IL");
    expect(restored!.priorDose.nominal).toBe(0.5);
  });

  it("round-trips an ended-but-unsaved session", () => {
    const ended = { ...session, endedAt: new Date("2026-07-15T18:15:00Z") };
    const restored = deserializeSession(serializeSession(ended));
    expect(restored!.endedAt!.toISOString()).toBe("2026-07-15T18:15:00.000Z");
  });

  it("rejects missing, malformed, or unknown-version data instead of crashing", () => {
    expect(deserializeSession(null)).toBeNull();
    expect(deserializeSession("not json")).toBeNull();
    expect(deserializeSession(JSON.stringify({ version: 2 }))).toBeNull();
    expect(deserializeSession(JSON.stringify({ version: 1, id: "x", startedAt: "garbage" }))).toBeNull();
  });
});
