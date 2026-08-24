# Proposed fixes — design-ambiguous defects (APPROVED & IMPLEMENTED)

Status: approved by user (Hybrid convention / non-breaking / throw-on-empty /
`maxProviders:0` valid no-op). All four implemented in `vivim-final` and verified
by regression harnesses. See `FIXES.md` §9–11 for the applied changes. The
decisions captured at the bottom were the ones taken.

Each entry lists: the problem (with file:line), the proposed change, the
**decision made**, and how it was verified.

---

## P1. capability-resolution — override value/source inconsistency
(file: `src/engines/capability-resolution.ts`, `mapRow` lines 241–309)

### Problem
Two independent code paths disagree:
- **Value selection** (247–273): the 17 UI fields (`uiComponent`, `uiLabel`, …,
  `dependsOn`) are *always* taken from the base columns (`row.ui_component`,
  `row.ui_label`, …), ignoring the `*_from` flags. The only field that honors an
  override is `uiSlots` (273, reads `ui_component_override`).
- **Provenance** (278–297): `overrideSources` reports `'provider' | 'tier'`
  from the `*_from` columns for those same 17 fields — claiming an override was
  applied when the value is actually the base column. And `uiSlots`, the one
  field that *does* apply an override, has **no `overrideSources` entry at all**.

This is the "override precedence" + "cross-field value/source mismatch" pair:
provenance says `provider`, value is `base` (contradiction), and the
override-applied field is untracked.

### Proposed fix (one convention; make both paths agree)
- For each of the 17 fields, when the corresponding `*_from !== 'global'`,
  select the value from the override column (where one exists) instead of base,
  and feed the *same* decision into `overrideSources` so value and source match.
- Add `uiSlots` to `overrideSources` (`uiSlots: toOverrideSource(row.slots_from)`)
  so the override-applied field is tracked.

### Decision required (this is the ambiguity)
The data model is underspecified:
- **Option A — base columns are pre-merged at write time** (so `_from` is purely
  informational). Then `uiSlots` is the *buggy* one (it reads the override column
  instead of the merged base). Fix = make `uiSlots` read the merged base and keep
  `overrideSources` as informational only.
- **Option B — `_override` columns carry the effective value** (matches the doc
  comment at line 66: "UI slots are sourced from
  `provider_capability.ui_component_override`"). Then the other 17 fields silently
  drop overrides. Fix = implement per-field override selection (Option B above).
- **Hybrid / minimal** — if the schema only has an override column for `uiSlots`,
  then: (i) add `uiSlots` to `overrideSources`; (ii) stop lying in `overrideSources`
  for the 17 base fields (mark them `'global'`/base, since they always use base),
  accepting that overrides are effectively unsupported except for slots.

**I need you to pick A, B, or Hybrid before I touch the code** (and ideally
confirm whether per-field override columns exist in the schema).

### Verification
`repros/capability-override-precedence.ts` flipped to a regression test
(overrideSources matches the resolved value; `uiSlots` present in
`overrideSources`).

---

## P2. stream-parser — unenforced streaming contract (`detectCompletion()=>true`)
(file: `src/engines/stream-parser.ts`, lines 226–287; default at 275)

### Problem
`parse(rawBody)` is **whole-body** (consumes the full string). The documented
contract — "caller accumulates bytes, then parses once at completion" — is
**implicit and unenforced**. The natural per-chunk loop
(`if (detectCompletion(p)) emit parse(p)`) is an active footgun because the
fallback/error parser defaults `detectCompletion: () => true` (275). A fuzz run
found 6/100 prefixes where that loop emitted partial/duplicated text
(`data: {"de` → emitted as a complete block) that differs from the final parse.

### Proposed fix (enforce an explicit completion contract)
- Add `isFinal?: boolean` to `parse(...)` and `detectCompletion(...)`.
- Refuse to emit a non-error, confident block unless completion is confirmed
  (real sentinel seen) OR `isFinal` is passed; otherwise buffer/await.
- Replace the `() => true` default with a conservative default that returns
  `false` until a real completion sentinel is observed.
- Lock parser selection at the first non-empty chunk (remove selection-flip risk).
- Keep the existing "accumulate + parse at completion" path working unchanged.

### Decision required
- **Non-breaking variant (recommended):** keep the public `parse` signature, but
  make `detectCompletion` honest (default `false`) and add an explicit
  `parseStreaming(chunk, { isFinal })` helper. Callers that already accumulate
  are unaffected.
- **Breaking variant:** change the public `parse` signature to require
  `isFinal`. Only if you're willing to update all callers.

I recommend the **non-breaking variant**. Confirm.

### Verification
Re-run the fuzz harness (`vivim-final/_fuzz_parser.ts` style) → 0 hazard prefixes
under the per-chunk loop; `repros/incremental-contract-gap.ts` turned into a
regression test.

---

## P3. provider-mux — silent no-op on empty + `maxProviders:0` + cost overrun
(file: `src/engines/provider-mux.ts`, lines 164–181, 203, 311/340/372/403, 293)

### Problem (three sub-defects)
- **D1 — silent no-op:** `mux()` resolves providers via
  `request.targetProviderIds ?? (await this.resolveProviderIds(request))`; when
  that is `[]`, the strategy dispatches nothing and `buildResponse` returns
  `status:'partial'`, `providerResponses:0`, `bestProviderId:null` — **no error**.
  Sibling `autoRoute()` *does* throw on empty (line 219), so the two entry points
  disagree.
- **D2 — `maxProviders:0` swallowed:** every strategy uses
  `providerIds.slice(0, request.maxProviders ?? providerIds.length)`. Because `??`
  only catches `null`/`undefined`, a literal `maxProviders:0` → `slice(0,0)` →
  dispatches nobody (silent empty result).
- **D3 — cost overrun:** `cost_optimized` checks
  `if (accruedCost >= budget) break` *before* each dispatch, so a single provider
  whose own cost already exceeds the remaining budget is still dispatched → total
  can overrun by up to one provider's cost.

### Proposed fix
- **D1:** when the resolved+limited provider set is empty, throw
  `EngineError('no providers resolved for mux')` (consistent with `autoRoute`),
  or at minimum return `status:'error'` with a clear reason instead of a silent
  `'partial'`. **Recommend throw.**
- **D2:** treat `0` as an explicit (valid) "dispatch none" but let D1's empty-set
  guard surface it; and replace `?? providerIds.length` with an explicit
  `request.maxProviders === undefined ? providerIds.length : request.maxProviders`
  so a deliberate `0` is distinguishable from "unset" in logs.
- **D3:** change the check to projected cost —
  `if (accruedCost + estimateCost(pid) > budget) break/skip` before dispatching.

### Decision required
- D1: **throw** (matches `autoRoute`) or **return `status:'error'`**? I recommend
  throw for fail-loud consistency.
- D2: is `maxProviders:0` ever a *legitimate* deliberate "send to nobody"? If yes,
  keep it as a valid no-op but rely on D1 to make it loud; if no, treat `0` as an
  error too.

### Verification
`repros/provider-mux.ts` flipped to a regression test (empty → throws/errors;
`maxProviders:0` logged distinctly; cost budget not overrun).

---

## P4. (covered by P3) — provider-mux `maxProviders:0` confirmed NOT a bug
From the earlier loop: `maxProviders:0` resolving to nobody with `??` is correct
behavior (0 is a legitimate value). I will **not** "fix" it as a bug — only make
it explicit/loud per P3-D2. No separate proposal needed.

---

## Summary of decisions I need from you
1. **P1:** Option A / B / Hybrid (and whether per-field override columns exist).
2. **P2:** Non-breaking (recommended) vs breaking signature change.
3. **P3:** D1 throw vs `status:'error'`; D2 is `0` legitimate or an error.

Approve each (or all) and I will implement the minimal root-cause change and
re-run the relevant `repros/` harness as a regression test.

---

## Subsequently approved — the three remaining design-ambiguous items
After §9–11, the user said "begin implementing" for the three still-open
design-ambiguous defects. All approved and implemented:
- **H6 — capability-resolution vacuous-context existential bypass** → fail-closed
  (`if (!context) return false`). Implemented §12; verified by
  `repros/capability-cross-field.ts`.
- **H10 / D2+D3 — policy-engine dead `allowFinancial` and `allowSecuritySensitive`
  vetoed by `maxRiskTier`** → both flags made functional. Implemented §13;
  verified by `repros/policy-engine.ts`.
- **H12 — router failover no idempotency/dedup** → within-request provider
  dedup guard added (cross-target failover preserved). Implemented §14; verified
  by `repros/router-failover.ts`.

All 14 `repros/` regression harnesses pass. No defects remain open from the loop.
