VALIDATED

# Verified: `searchCapabilities` drops valid results (LIMIT 20 + unescaped ILIKE)

## What was found
`CapabilityResolutionStoreImpl.searchCapabilities` filters with
`ct.name ILIKE '%'+query+'%'` and `LIMIT 20` in SQL, then the engine re-filters
the already-truncated rows with a *literal* `.includes()`. Two compounded
defects:

1. **`LIMIT 20` before the precise filter** — when the loose `ILIKE` matches >
   20 rows, valid literal matches are permanently dropped (the engine can only
   filter what the SQL returned).
2. **Unescaped `ILIKE` wildcards** — `%` and `_` in the user query are regex
   wildcards in Postgres, so `50%` matches `503`; a crowd of such
   false-positives can fill the LIMIT and push out the real literal match.

Corroborating (code-confirmed): `resolveCapabilities` returns all capabilities
regardless of `min_plan_tier` — the engine's `tierRank` is the *sole* tier gate
(no data-layer defense-in-depth), and the store reads only
`ui_component_override` (only `uiSlots` is overridable — H2).

## How it was verified
`repros/capability-store-search.ts` faithfully simulates the SQL
`ILIKE('%'+query+'%')` + `LIMIT 20` + engine literal-filter pipeline:
- 25 "Alpha Feature N" → `search` returns 20, ideal literal returns 25 (5 dropped).
- Query `50%` in a crowd of 20 "503" false-positives → real `"my 50% discount
  code"` match dropped (search returns 0, ideal returns 1).
All 7 assertions PASS.

## Severity (honest)
Search **correctness**, not a security boundary. Manifests only at scale or with
wildcard-heavy queries. The engine's literal re-filter mostly rescues precision
except when the LIMIT truncates first. Subagent validation, not human review.

## Suggested fix
Escape `%`/`_` in the user query before `ILIKE`, or use a literal/FTS match;
apply `LIMIT` after the precise filter; optionally filter tier in SQL for
defense-in-depth.
