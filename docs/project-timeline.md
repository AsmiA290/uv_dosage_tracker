# Project timeline (dated)

Generated 2026-09-13, targeting a submission window ending **2026-10-26** per the brief. That's about 6.1 weeks -- close enough to the brief's 6-week plan that the mapping below is nearly 1:1. **First, confirm the actual IL-13 deadline** (see the blocking action item below) before treating 10-26 as fixed -- the 2025 district deadline ran later than the national date.

| Week | Dates | Focus |
|---|---|---|
| 0 (this week) | Sep 13 - Sep 19 | Blocking admin: confirm deadline, register for IL-13, confirm originality rule, repo created (done as of this session) |
| 1-2 | Sep 20 - Oct 3 | Dose model + Vitest suite (this session got you a working first draft of both -- budget this window for verifying MED citations, tightening corrections, and adding any edge cases you find); historical UV pull + district evidence figures |
| 3 | Oct 4 - Oct 10 | Data pipeline hardening, Postgres + Drizzle persistence, graceful degradation |
| 4-5 | Oct 11 - Oct 24 | v0 screen builds (Now, Session, History, Methods), PWA/offline, accessibility pass |
| 6 | Oct 25 - Oct 26 | This is dangerously tight for "get 3 real users + record + edit a video + submit 72 hours early." See the note below. |

## The schedule is tight -- here's the real risk

The brief's own week-6 checklist (real user testing, then a 3-minute video, then a 72-hours-early submission) does not fit into the two days between Oct 25 and an Oct 26 deadline. Two honest options:

1. **Compress weeks 1-5 by roughly a week** so user testing + video land around Oct 12-19, leaving a real buffer before the 26th.
2. **Confirm the actual IL-13 deadline immediately** (blocking item #1 below) -- if it follows 2025's pattern of landing a few days to a week after the national date, that recovers exactly the slack this plan is short on.

Either way, do not start the video during the final week. Move that block earlier the moment you have a working three-screen app, even if History is still rough.

## Immediate blocking items (do these before writing more code)

- [ ] Email McKayla Bartkiewicz (mckayla.bartkiewicz@mail.house.gov) to confirm the exact IL-13 submission deadline and time zone.
- [ ] Register on congressionalappchallenge.us for IL-13.
- [ ] Confirm the 2026 originality rule (built within one year of the deadline, solely owned by you).
- [x] Repository created with `/lib/dose`, `/analysis`, and `/app` from day one.
