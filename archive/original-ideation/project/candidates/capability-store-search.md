claimed-by: lead (iteration 1, capability-store-impl)
READY FOR VALIDATION

# Candidate: `searchCapabilities` drops valid results — LIMIT 20 + unescaped ILIKE wildcards vs literal engine filter

## Approach / claim
`CapabilityResolutionStoreImpl.searchCapabilities` (lines 49–81) builds
`WHERE (ct.name ILIKE $3 OR ...) AND ... LIMIT 20` with `$3 = '%' + query + '%'`.
Two problems:

1. **`LIMIT 20` is applied in SQL, before the engine's precise filter.**
   The engine then re-filters the (already truncated) rows with a *literal*
   `.includes()` (`applySearchFilter`, capability-resolution.ts:357–361). When
   the SQL `ILIKE` matches more than 20 rows, valid literal matches are
   permanently dropped.
2. **`ILIKE` wildcards are unescaped.** Postgres `ILIKE` treats `%` and `_` as
   wildcards. A user query `50%` becomes pattern `%50%%`, matching `503`,
   `500`, etc. (false positives). Combined with (1), a crowd of wildcard
   false-positives can fill the LIMIT 20 and push out the real literal match.

Additionally (code-confirmed, not a new defect): `resolveCapabilities`
(lines 18–38) filters only on `binding_status` — it returns **all** capabilities
regardless of `min_plan_tier`. The engine's `tierRank` is the *sole* tier gate,
so the H1/H3 engine bug is the only entitlement boundary (no defense-in-depth
at the data layer). The store also reads only `ui_component_override`
(corroborating H2: only `uiSlots` is overridable).

## Why it seems promising
Executed simulation `repros/capability-store-search.ts` faithfully replicates
the SQL `ILIKE('%'+query+'%')` + `LIMIT 20` + engine literal-filter pipeline:
- 25 caps named "Alpha Feature N": ideal literal search finds 25, but `search`
  returns 20 → **5 valid results dropped** by LIMIT.
- Query `50%` against `["HTTP 503 error page", "my 50% discount code", ...]`:
  SQL `ILIKE` matches "HTTP 503 error page" (false positive via `%`→`.*`);
  a crowded set of 20 "503" false-positives fills LIMIT 20 and the real
  `"my 50% discount code"` match is **dropped**.

## What needs to be checked next
- Whether the 20-item cap is an intended UI limit (even so, it must be applied
  to the *precisely filtered* result, not before).
- Whether any caller relies on `search` for correctness (not just UI display).

## Confidence
High — executed, deterministic, and visible directly in the SQL (lines 68, 71)
and the engine's literal filter (357–361). Severity is search **correctness**,
not a security boundary; the tier/override findings are corroborations of the
earlier engine defects, not new.

## Validation (validator agent, 2026-08-23)
Ran `repros/capability-store-search.ts` — ALL PASS (7/7).

1. **Counterexample** (executed): 25 "Alpha Feature N" caps → `search('Alpha')`
   returns 20, `ideal('Alpha')` returns 25 → 5 valid results dropped. Crowd of
   20 "503" false-positives + one real `"my 50% discount code"` → `search`
   returns 0, ideal returns 1 → real match dropped.
2. **Independent re-derivation**: read `searchCapabilities` SQL (49–81): the
   `ILIKE $3` with `$3='%'+query+'%'` (line 68, 73) and `LIMIT 20` (line 71) are
   structural; the engine's `applySearchFilter` (capability-resolution.ts
   357–361) uses `name.toLowerCase().includes(q)` (literal). The two filter
   paths are independent and disagree; LIMIT is applied to the loose path
   first. The defect follows structurally, not from the harness.
3. **Edge / boundary**:
   - `_` (any single char) is likewise a wildcard in `ILIKE`: a query `a_b`
     matches `axb`/`aab`. Not separately harnessed but same root cause.
   - If fewer than 20 SQL matches, results are correct (bug only manifests at
     scale / with wildcard-heavy queries) — consistent with "correctness, not
     security."
   - Defense-in-depth: `resolveCapabilities` (18–38) has no tier filter, so the
     engine's `tierRank` (the H1/H3 bug) is the only gate — confirmed by reading
     the SQL `WHERE` (line 33).
4. **Executed stress**: `bun run repros/capability-store-search.ts` → ALL PASS.

**Suggested fix** (`capability-resolution-store-impl.ts` `searchCapabilities`,
lines 49–81): (a) escape LIKE metacharacters in the user query
(`query.replace(/[%_]/g, m => '\\' + m)`) or switch to a literal/Full-Text
match; (b) apply `LIMIT 20` **after** the precise filter (filter precisely in
SQL or post-filter in JS before slicing); (c) optionally add tier filtering in
SQL for defense-in-depth so the data layer never returns gated tiers.

**Verdict: SURVIVED VALIDATION** — defects demonstrated by execution and
independent source reading. Severity is search correctness; not a security
boundary. Subagent validation, not independent human review.
