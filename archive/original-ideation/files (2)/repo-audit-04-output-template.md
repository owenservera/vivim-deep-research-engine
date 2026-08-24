# OUTPUT.md Template (fixed structure — do not improvise a different shape)

This is what the synthesizer produces every run. Same structure every time so
you can diff audits of the same repo over time, and so it's fast to review.

```markdown
# Repo Enhancement Audit — [repo name] — [date]

**STATUS: Pending human review. Not an approved work plan.**

## Summary
- Repo: [path/URL], stack: [detected stack]
- Candidates scanned: [N] | Triaged out at Phase 1: [N] | Investigated: [N] |
  Survived validation: [N] | Final scored items: [N, note if <5 and why]
- Budget used: [X% of stated budget]

## Enhancement #1: [short title]
**Composite score: [N]/25**

| Dimension | Score | Note |
|---|---|---|
| Evidence strength | X/5 | [one line — what's the proof] |
| Impact if fixed | X/5 | [one line] |
| Risk of the fix (lower=safer) | X/5 | [one line] |
| Effort (lower=easier) | X/5 | [one line] |
| Confidence it's not already known/intentional | X/5 | [one line] |

**Evidence**: [file:line references, link to reproduction — failing test
path, benchmark output, audit tool output. Concrete, not descriptive.]

**Proposed fix (if applicable)**: [one paragraph, or "requires design
discussion — see effort score"]

**Context check**: [what the context-researcher found — nothing/ambiguous/
confirmed-not-intentional]

**Validator notes**: [what was tried to break this, and why it survived]

---

## Enhancement #2: [same structure]
...

## Enhancement #3, #4, #5
...

## Caveats and blind-spot findings
[From the blindspot subagent — what categories of issue this process is
structurally unlikely to have caught, e.g. load-dependent issues, business
logic correctness, anything needing domain expert input. State plainly, don't
bury.]

## What was ruled out
[Brief note on notable candidates that didn't make the cut and why — e.g.
"12 additional candidates in triaged_out.md and candidates/ did not survive
validation or were disqualified per rubric — see those files for detail."]

## Recommended next step
Human review of the above before any fix is implemented. [If any candidate
touches a high-risk/high-blast-radius area, flag that explicitly here again.]
```

## Notes on using this once generated

- **Diffing across runs**: because the structure is fixed, running the same
  audit again after fixes land should show fewer/different items — if you run
  this periodically, keep past OUTPUT.md files (e.g. `OUTPUT-2026-08-23.md`)
  so you can track whether real issues are actually decreasing.
- **Feeding into ticket creation**: the per-item structure (title, evidence,
  proposed fix) maps directly onto a ticket body if you want your AI to create
  tickets from this — but that should be a separate, explicit step you
  trigger, not something the audit does automatically. Don't let "audit the
  repo" silently become "file 5 tickets without me looking" — Phase 4 (human
  review) sits between the two on purpose.
- **A short list is a valid, good outcome.** If OUTPUT.md legitimately has 3
  items because 2 didn't survive the process honestly, that's the process
  working, not underdelivering.
