# Fixes applied — research-cip

All fixes are in `C:\0-BlackBoxProject-0\index` and verified by the `repros/` harnesses
(re-run as regression tests → must PASS). This file is the durable log of what was changed.

## Scope

- **Wave 1 (highest-severity / fail-open class):** any defect that lets the index or audit silently lie (H1, H4, H8, H14).
- **Wave 2 (careful fix pass):** every other *confirmed real* defect, minimal root-cause change, re-verified.
- **Explicitly NOT fixed (design-ambiguous, needs decision):** proposals go to `PROPOSALS.md`; once approved they become a fix section here.

_No fixes yet — loop has not produced a SURVIVED VALIDATION candidate._

## Template for a fix section

## N. path — short title (H hazard)
File: `lib/cipkg/...py:func`
- Before: ...
- After: ...
- Verified: `python repros/cip-xxx.py` -> ... (PASS with counts)
- Risk: ...

