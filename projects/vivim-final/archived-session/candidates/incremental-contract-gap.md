claimed-by: lead-smoke-test
READY FOR VALIDATION

# Candidate: StreamParserEngine has an unenforced streaming contract; the `detectCompletion()=>true` default is the concrete defect

## Approach / claim
The engine is a **whole-body** parser: `parse(rawBody)` consumes the entire
string and returns the final block set. Its documented contract is "caller
accumulates bytes, then parses once at completion." That contract is
**implicit and unenforced**, and one specific default makes the *obvious*
streaming usage pattern unsafe:

- `detectCompletion()` is implemented per-parser and **defaults to `true`** in
  several seed/inline parsers (see `vivim-final/_repro2_stream_parser.ts`:
  `detectCompletion() { return true; }`).
- The natural streaming loop is: on each chunk, call `detectCompletion(prefix)`;
  if true, `parse(prefix)` and emit. With the `true` default, this fires on the
  **first** chunk and emits whatever partial bytes exist as a confident,
  complete-looking block.

The fix is not "parse at completion" (that already works) — it is to **make the
contract explicit and enforced**:
1. Engine should refuse to emit confident non-error blocks unless completion is
   confirmed OR the caller passes an explicit `isFinal` flag.
2. `detectCompletion()===true` on a prefix that never saw a real completion
   sentinel should be treated as "incomplete / don't commit."
3. Lock parser selection at the first non-empty chunk to remove any
   per-call selection flip risk.

## Why it seems promising
Backed by an **executed** fuzz run (bun) against the real engine:
- T1 determinism: PASS (0/100 mismatches across random partitions) — control.
- T2 hazard: **HAZARD PRESENT (6 prefixes)** where the always-complete parser
  emitted partial/duplicated text on a prefix judged "complete," while the final
  parse differed. Concrete example: prefix `data: {"de` → emitted
  `data: {"de` (final is the full SSE). A consumer acting on it would emit wrong
  content.
- T3 selection: stable on this corpus (not reproduced here).

## What needs to be checked next
- Adversarial: is this "working as intended" because callers must accumulate?
  (See validator note — the defect is the *unenforced* contract + the `true`
  default, not the accumulation model itself.)
- Whether any shipped VIVIM parser actually uses the `true` default in
  production (the repro file suggests seed/inline parsers do).
- Selection-flip on a multi-wire-format provider (e.g., gemini batchexecute vs
  SSE) — not reproduced yet.

## Confidence
High that the *contract gap + true-default* is a real defect (executed evidence).
Medium that it is "exploited" in production (depends on which parsers ship).

## Validation (validator agent, 2026-08-23)
Ran the executed fuzz harness (`vivim-final/_fuzz_parser.ts`) and attacked the claim.

1. **Counterexample search**: T2 reproduced the hazard — 6 prefixes where the
   always-complete parser emitted partial/duplicated text on a prefix judged
   "complete," while `parse(R)` differed. Concrete: prefix `data: {"de` →
   emitted `data: {"de`; final is the full SSE. A consumer in the natural
   `if detectCompletion(p) parse(p)` loop would emit wrong content. **Found.**
2. **Independent re-derivation**: the engine is whole-body (`parse` consumes the
   full string; no incremental state). Under "accumulate, parse at completion,"
   T1 determinism holds (0/100 mismatches) — independently confirmed. The hazard
   arises only when `detectCompletion` returns true prematurely, i.e. the
   `true` default. The two facts are consistent.
3. **Edge / boundary check**: with the *correct* claude-SSE parser (real
   `detectCompletion` on `[DONE]`), the hazard does NOT trigger — partial
   prefixes are not judged complete. So the defect is **conditional on parser
   quality**, not universal. This refines (not rejects) the claim.
4. **Empirical stress test**: T2 executed against the real engine under bun;
   T3 (selection flip) was checked and **NOT reproduced** on this single-wire-
   format corpus — so selection-flip is explicitly NOT claimed as a finding.

**Adversarial counterargument (considered and resolved):** the engine's own
comments state the caller accumulates and parses at completion, so a correct
caller never calls `parse` on a non-final prefix — is this "working as intended"
rather than a bug? Resolution: the contract is *implicit and unenforced*, the
public API (`detectCompletion` + `parse`) actively invites the per-chunk loop,
and the `true` default **guarantees** that loop breaks. That is a latent
footgun, not guaranteed incorrectness — the claim is therefore reworded from
"engine has a contract bug" to "engine provides no guard; the `true` default is
the concrete trigger; fix = enforce an explicit completion/isFinal contract."

**Secondary observation (flagged, not yet a standalone candidate):** the
quickjs `SandboxRunner` aborted (`list_empty(&rt->gc_obj_list)`) when the engine
was instantiated ~200× (per-request style). After reusing ONE engine it did
not occur. So this is **conditional on per-request engine instantiation**; if
VIVIM reuses a singleton engine it is not triggered. Needs reproduction against
the real instantiation pattern before being called a defect.

**Verdict: SURVIVED VALIDATION** (claim refined to the latent-footgun framing;
selection-flip explicitly excluded; sandbox-abort noted as conditional). This is
subagent validation, NOT independent human-expert confirmation.
