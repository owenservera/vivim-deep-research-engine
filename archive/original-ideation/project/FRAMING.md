# Framing

> This file is a *template*. For a new problem, replace the sections below but
> keep the **Codebase / how to run checks** field when the problem touches code
> or a shipped system — generators and validators must read that code and run
> checks against it. (The body below is the active problem for this session.)

## Question
VIVIM's `CapabilityResolutionEngine`
(`vivim-final/src/engines/capability-resolution.ts`) turns capability rows into
the UI contract shown to a provider at a given plan tier. It applies a 3-layer
override chain plus **plan-tier gating**, **existential-rule** evaluation, and
**dependency satisfaction**, and a separate `search()` path.

Does the resolver satisfy its core correctness invariants, and where does it
silently break? Concretely, for any capability set S and provider P:
- **(I1) Tier monotonicity**: `resolve(P, t_low)` is a subset (by id) of
  `resolve(P, t_high)` for `t_low < t_high`. Higher tiers must reveal more.
- **(I2) Tier gating actually gates**: a capability with `min_plan_tier = T` is
  excluded for every tier `< T`, *regardless of how `min_plan_tier` is spelled*
  (case, whitespace, unknown token).
- **(I3) Existential correctness**: a capability with rule `k == v` appears
  iff `String(context[k]) === v`; with `k != v` iff `String(context[k]) !== v`;
  with `!k` iff `context[k]` is falsy.
- **(I4) Search ⊆ resolve**: every capability returned by `search(P, t, q)` is
  also returned by `resolve(P, t)` (search never bypasses gating/existential/
  dependency filters).

## Verification criterion
EXECUTED property test (bun) against the real engine with a mock
`CapabilityResolutionStore` (no DB needed — the engine only consumes the store
interface). Each invariant I1–I4 is a machine-checked assertion over a corpus
of crafted rows. A finding = an invariant that fails, with the exact row +
observed vs expected. Re-run after any fix.

## Scope boundaries
- Only `CapabilityResolutionEngine` (resolve + search + gating + existential +
  dependency). Not the store SQL, the capability bootstrap/discovery, or the UI.
- We test the engine's logic, not provider data — but we DO probe how the engine
  behaves on non-normalized `min_plan_tier` strings (a data-hygiene risk).

## Budget
Small: a handful of generator approaches (one per invariant), 1 validator pass,
one executed harness. System-validation + real-finding exercise.

## Known prior work (fill in as literature agents find things)
- Engine is read-only: the 3-layer COALESCE/CASE resolution happens in the store;
  the engine applies tier gating, existential rules, dependency checks, grouping.
- `tierRank()` defaults unknown tiers to rank 0 (`?? 0`).
- `satisfiesExistentialRule()` coerces with `String(actual) === expected` and
  treats unparseable rules as "satisfied" (does not hide the capability).

## Codebase / how to run checks
- Target: `C:\0-BlackBoxProject-0\vivim-final\src\engines\capability-resolution.ts`
- Run a check with bun from the research project dir:
  `bun run repros/<name>.ts` (the repro imports the engine by absolute path).
