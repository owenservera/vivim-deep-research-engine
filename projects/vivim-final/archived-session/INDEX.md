# INDEX — per-target research outcomes

Accumulated across loop iterations. Each entry is one completed (or blocked)
target. See `HAZARDS.md` for the cross-loop defect patterns and `deadends.md`
for the tagged failure log.

## [2026-08-23 15:30] stream-parser — done
**Path**: vivim-final/src/engines/stream-parser.ts
**Outcome**: T1 deterministic PASS; T2 premature-commitment HAZARD reproduced only for parsers with detectCompletion()=>true default (6 executed cases); T3 selection-flip NOT reproduced. Artifacts: candidates/incremental-contract-gap.md, repros/incremental-contract-gap.ts, verified/incremental-contract-gap.md.
**Hazards exercised**: H1, H4, H5

## [2026-08-23 17:06] capability-resolution — done
**Path**: vivim-final/src/engines/capability-resolution.ts
**Outcome**: Two validated defects: (1) tier gate fails open on non-lowercase min_plan_tier (H1/H3); (2) override precedence inconsistent / overrideSources untrustworthy (H2). Cross-field AND and search-subset clean. Artifacts: candidates/capability-tier-casing.md, candidates/capability-override-precedence.md, repros/capability-*.ts, verified/*.md.
**Hazards exercised**: H1, H2, H3, H4, H5, H6, H7

## [2026-08-23 17:51] capability-store-impl — done
**Path**: vivim-final/src/storage/impl/capability-resolution-store-impl.ts
**Outcome**: Iter1: searchCapabilities drops valid results (LIMIT 20 before precise filter + unescaped ILIKE %/_ wildcards). Executed repros/capability-store-search.ts (7/7). Corroborated: store does no tier filter (engine tierRank is sole gate) and reads only ui_component_override (H2). Candidate + verified/capability-store-search.md. New hazard H8.
**Hazards exercised**: H1, H2, H3

## [2026-08-23 18:10] safe-eval — done
**Path**: vivim-final/src/engines/safe-eval.ts
**Outcome**: 1 defect: assertTrustedExpressionSource denylist fails open (reachable globals WebSocket/navigator/Blob/TextEncoder/structuredClone/MessageChannel/crypto/BroadcastChannel; case-sensitive H3). Harness repros/safe-eval-guard.ts 17/17 PASS. H9 added. Severity conditional on SandboxRunner eval scope.
**Hazards exercised**: H1, H4

## [2026-08-23 18:54] policy-engine — done
**Path**: vivim-final/src/engines/policy-engine.ts
**Outcome**: 3 defects: D1(H1) RISK_TIER[risk]??0 fail-open on unknown risk (allowed); D2 dead allowFinancial (no financial risk enum); D3 allowSecuritySensitive vetoed by maxRiskTier. Harness repros/policy-engine.ts 7/7 PASS. H10 added.
**Hazards exercised**: H1, H4, H6

## [2026-08-24 08:31] provider-mux — done
**Path**: vivim-final/src/engines/provider-mux.ts
**Outcome**: 3 defects: D1 mux() silent no-op on empty providers (disagrees w/ autoRoute throw); D2 maxProviders:0 swallowed by ?? -> nobody dispatched; D3 cost_optimized overruns budget by one provider. Harness repros/provider-mux.ts 4/4 PASS. H11 added.
**Hazards exercised**: H1, H3, H5

## [2026-08-24 08:45] router — done
**Path**: vivim-final/src/router/router.ts
**Outcome**: 2 defects: D1 failover re-dispatches identical payload to every target (no idempotency -> duplicate side effects, H12); D2 misleading targetProviderId on total failure. Also noted default-router LearnedStrategy orphaned. Harness repros/router-failover.ts 4/4 PASS. H12 added.
**Hazards exercised**: H1, H5

## [2026-08-24 08:55] kernel-registry — done
**Path**: vivim-final/src/engines/kernel/kernel-registry.ts
**Outcome**: 2 defects: D1 health/EngineDescriptor status vocab mismatch (listEngines({status:'healthy'}) empty; degraded leaves status stale); D2 getDependencies returns unresolved 'ghost' dep ids. Harness repros/kernel-registry.ts 7/7 PASS. H13 added.
**Hazards exercised**: H1, H2, H3

## [2026-08-24 08:58] trust-score — done
**Path**: vivim-final/src/engines/trust-score.ts
**Outcome**: 2 defects: D1 missing evidence scored as trusted (no-data provider=68/100; computeOperationScore=50 on zero outcomes, H14); D2 slaveId.includes(providerId) substring false-positive (H7). Harness repros/trust-score.ts 6/6 PASS. H14 added.
**Hazards exercised**: H1, H7

## [2026-08-24 09:01] streaming-protocol — done
**Path**: vivim-final/src/engines/streaming-protocol.ts
**Outcome**: 2 defects: D1 double-storage (captureChunk + finishConversation re-store, H15/H5); D2 processIncremental(parseIncremental) never persists + leaves buffer empty (H15/H2). Harness repros/streaming-protocol.ts 5/5 PASS. H15 added.
**Hazards exercised**: H4, H5
