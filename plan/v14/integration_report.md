# v1.4 "Tuning" integration report (verifier, branch `v1.4-tuning`, 2026-10-07)

DRAFT: the verify run is in progress (started 00:14 UTC after a container restart cut the first verifier at ~00:12; nothing of
that run was used). Sections fill in as the matrix streams finish.

## 1. What was verified
- Branch `v1.4-tuning` at 476ee4e (build + re-probe). Owner picks (status.md Addendum 7): M1 "Gigs pay, side jobs less" (the
  critic's B+), M2 "Fair grades", M3 jam room $35/wk until signed. Build detail: `plan/v14/build_report.md`; re-probe:
  `plan/v14/probe_after.md`.
- Source vs `main` (1.3.1.0): 22 files in `src/` + `tests/` (355+ / 50-); no new state key, SAVE_SCHEMA stays 10.

## 2. Checklist
- Build: `node build.js` -> V1.4.0.0, 99 modules, **5,244,808 B** (gate <= 6,000,000; `tools/perf.js size` ok; gzip-9
  1,717,889 B; v1.3.1 was 5,236,063 B). A rebuild at 476ee4e leaves `dist/` byte-identical (git clean).
- Node suite, full Playwright matrix (390x844 + 440x956), pw_perf, phoneqa: pending.

## 3. Owner check shots (440x956)
Pending.

## 4. Findings
Pending.
