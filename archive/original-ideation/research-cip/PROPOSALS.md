# Proposals — design-ambiguous defects awaiting a decision

When a validated finding is not a clear bug but a *design choice that could go either way*
(e.g. "should `sync` with empty dirty still do a full edge rebuild?" — silent no-op vs fail-loud),
do NOT silently fix it. Write the proposal here, get human sign-off, then move it to FIXES.md.

Format per proposal:

## P-N. <title> — <path>
**Hazard**: Hxx
**Finding**: one paragraph + `repros/...py` evidence
**Options**:
- A: ... (pros/cons)
- B: ... (pros/cons)
- Hybrid: ...
**Recommendation**: ...
**Decision**: _pending / approved A / approved B / rejected_

---

_No proposals yet._

