# Repros

Executable reproductions / verification harnesses produced by the fleet. Each
file here is a runnable check that demonstrates (or refutes) a candidate.

Convention:
- A repro is *runnable*. For code-IP problems it imports the target codebase by
  **absolute path** so it runs from this directory (no need to drop it into the
  target repo). Adjust the absolute path at the top of the file.
- Name it `<candidate-short-name>.ts` / `.py` and reference it from the
  candidate's Validation section.
- A repro that *demonstrates* a bug is a positive result for the research
  process; a repro that *fails to reproduce* is equally valuable — log it in
  deadends.md so the fleet doesn't overclaim.
- Re-run with the target's toolchain (e.g. `bun run repros/<name>.ts`).
