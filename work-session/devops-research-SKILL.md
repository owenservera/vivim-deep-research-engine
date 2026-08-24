---
name: devops-research
description: >
---
# devops-research

Research-first intelligence layer. Bridges deep-research (web search + synthesis)
with the devops system (tracker + gate + ADRs + goals). Not just "research a
topic" — it's "research AND wire findings into the devops infrastructure."

## When to Load

**Load this skill when:**
1. User says "research X", "deep dive on Y", "investigate Z"
2. Before implementing a CREATE unit (invariant A5 requires brief)
3. When creating an ADR (invariant A6 requires research evidence)
4. When freshness check flags stale research (invariant A7)
5. When `devops roadmap --discover` finds a research gap
6. User says "what do we know about X?" or "check research for Y"

**Do NOT load when:**
- Resuming an in-progress unit (just run devops loop)
- Unit is already clearly defined with existing research
- Topic is purely conversational (not implementation-bound)

## Output Tiers

| Tier | Location | Purpose | Gate Check |
|------|----------|---------|------------|
| **Full Report** | `docs/research/reports/<topic>-sota-YYYY.md` | SOTA deep dive, 384+ lines | No |
| **Brief** | `docs/research/briefs/<topic>-brief.md` | 1-2 page summary for implementers | **Yes (A5, A6)** |
| **Evidence** | `docs/research/evidence/<topic>/sources.json` + `notes.md` | Raw citations, machine-readable | No |
| **Code Path** | `docs/research/code-paths/<topic>-path.md` | Confirmed workable code with rationale | No (recommended) |
| **Attempted Paths** | `docs/research/code-paths/<topic>-attempted.md` | Documented failed approaches for future reference | No |

**Gate only checks briefs.** Reports, evidence, and code paths are optional but recommended.

## MCP Requirements

At least one of (in priority order):
1. **firecrawl** — `firecrawl_search`, `firecrawl_scrape`, `firecrawl_crawl`
2. **exa** — `web_search_exa`, `web_search_advanced_exa`, `crawling_exa`
3. **web-search-prime** — `web_search_prime` (Z.AI MCP fallback)

Both firecrawl + exa together give best coverage. If neither is configured,
fall back to web-search-prime. If none are available, skip web search and
use local knowledge only (flag as `confidence: Low`).

## Workflow

### Phase 1: Classify Request

Determine the research scope:

| Input | Classification | Action |
|-------|---------------|--------|
| "research event bus patterns" | General | Full report + brief + evidence |
| "research intent decomposition for unit 2.1" | Unit-linked | Full report + brief + evidence + tracker update |
| "research before creating ADR-014" | ADR-linked | Brief + attach to ADR |
| `devops roadmap --discover` found gap | Gap-triggered | Research gap topic + close gap |
| Freshness check flagged stale | Re-verification | Update report + bump freshness |
| "find workable code for X" | Code-focused | Iterative deep-dive to confirmed code |

### Phase 2: Execute Research (deep-research pattern)

```
1. Break topic into 3-5 sub-questions
2. For EACH sub-question:
   a. Search with available MCP tools (2-3 keyword variations)
   b. Aim for 15-30 unique sources total
   c. Prioritize: academic > official > reputable news > blogs
3. Deep-read 3-5 key sources (full content, not snippets)
4. Cross-reference claims (single source = flag unverified)
```

### Phase 2b: Iterative Deep-Dive (Code Convergence)

**Purpose:** Run repeated investigation cycles until reaching a confirmed workable code path or a clear implementation strategy. This phase is triggered when:
- User asks for "workable code", "confirmed approach", "clear path"
- Research topic involves complex integration or unfamiliar patterns
- First-pass research yields conflicting or uncertain guidance

```
CONVERGENCE LOOP (max 6 iterations):

ITERATION N:
1. HYPOTHESIZE — Based on findings so far, propose the most promising approach
2. VALIDATE — For each proposed approach:
   a. Search for: "<library/pattern> working example", "<library/pattern> tutorial"
   b. Search for: "<library/pattern> pitfalls", "<library/pattern> common errors"
   c. Look for: GitHub repos with working implementations
   d. Check: official docs for gotchas, version compatibility
3. TEST-MENTALLY — Walk through the code path mentally:
   a. What imports are needed?
   b. What config is required?
   c. What are the runtime dependencies?
   d. What could fail at runtime?
4. DOCUMENT-CONFIDENCE — Rate each approach:
   | Approach | Confidence | Evidence | Risk | Verdict |
   |----------|------------|----------|------|---------|
   | Option A | High/Med/Low | Sources: N | Risk: ... | PROCEED/AVOID/INVESTIGATE |
5. DECIDE:
   - If ANY approach rated High confidence → EXIT LOOP → Phase 3
   - If approaches rated Medium → Continue to iteration N+1 with focused search
   - If all approaches rated Low → Continue with narrower search or flag CONFLICT
   - If iteration = 6 and still no High → EXIT with best available + clear caveat

POST-LOOP:
- If CONVERGED (High confidence reached): Output confirmed code example + rationale
- If PARTIAL CONVERGENCE (Medium): Output best approach + risk mitigation + fallback
- If NO CONVERGENCE (all Low): Output all explored paths + why each failed + recommended next step (prototype, spike, ask community)
```

**Convergence Criteria:**
- ✅ CONFIRMED: Working code example found + compatible with project stack + no known blockers
- ⚠️ PROBABLE: Strong example found but needs adaptation + risks identified + mitigation plan
- ❌ UNRESOLVED: Conflicting guidance or no working example → flag for prototype/spike

### Phase 3: Produce Outputs

#### Full Report (`docs/research/reports/<topic>-sota-YYYY.md`)

```markdown
# <Topic>: Research Report
*Generated: YYYY-MM-DD | Sources: N | Confidence: High|Medium|Low*

## Executive Summary
[3-5 sentence overview]

## 1. [Major Theme]
[Findings with inline citations]
- Key point ([Source](url))
- Supporting data ([Source](url))

## 2. [Major Theme]
...

## Key Takeaways
- [Actionable insight 1]
- [Actionable insight 2]

## Sources
1. [Title](url) — one-line summary
2. ...

## Methodology
Searched N queries across web and news. Analyzed M sources.
```

#### Brief (`docs/research/briefs/<topic>-brief.md`)

```markdown
# <Topic> — Brief

**Source:** [full report](../reports/<topic>-sota-YYYY.md)
**Confidence:** High|Medium|Low | **Sources:** N | **Date:** YYYY-MM-DD

## TL;DR
[2-3 sentence summary]

## Key Decisions
1. [Decision 1]
2. [Decision 2]

## Evidence Summary
- [Source]: [claim] (confidence level)
- [Source]: [claim] (confidence level)

## Open Questions
- [Unresolved question 1]
- [Unresolved question 2]

## Used In
- [ADR/Unit/Goal that uses this research]
```

#### Code Path Brief (when convergence achieved)

When the iterative deep-dive converges on a confirmed approach, also produce:

`docs/research/code-paths/<topic>-path.md`:

```markdown
# <Topic> — Confirmed Code Path

**Convergence:** CONFIRMED | PROBABLE | UNRESOLVED
**Iterations:** N | **Confidence:** High|Medium|Low
**Date:** YYYY-MM-DD

## Recommended Approach
[Clear description of the approach that was validated]

## Working Code Example
```typescript
// Confirmed working code based on research
// Sources: [list of sources that validated this approach]
import { ... } from '...';

// Step-by-step implementation
```

## Why This Works
1. [Evidence point 1 with source]
2. [Evidence point 2 with source]

## Prerequisites
- [Dependency 1]
- [Dependency 2]

## Known Gotchas
- [Pitfall 1 + mitigation]
- [Pitfall 2 + mitigation]

## Alternatives Considered
| Approach | Why Rejected | Source |
|----------|--------------|--------|
| Option B | [reason] | [source] |
| Option C | [reason] | [source] |

## Verification Steps
1. [How to verify this works in our context]
2. [Test case or integration point]

## Risk Assessment
- **Technical risk:** Low|Medium|High
- **Integration risk:** Low|Medium|High
- **Maintenance risk:** Low|Medium|High
```

#### Unresolved Path (when convergence fails)

If no confirmed path found after iterations:

`docs/research/code-paths/<topic>-attempted.md`:

```markdown
# <Topic> — Attempted Paths (No Convergence)

**Convergence:** UNRESOLVED
**Iterations:** 6 (max) | **Date:** YYYY-MM-DD

## Summary
Despite 6 investigation iterations, no confirmed workable code path was found.
Below are all explored approaches and why each was inconclusive.

## Explored Paths

### Path A: [Approach name]
- **Search queries tried:** [...]
- **Sources found:** N
- **Why inconclusive:** [conflicting guidance / missing example / version incompatibility]
- **Confidence:** Low

### Path B: [Approach name]
- **Search queries tried:** [...]
- **Sources found:** N
- **Why inconclusive:** [reason]
- **Confidence:** Low

## Conflicting Evidence
- [Source X says A] vs [Source Y says B]

## Recommended Next Steps
1. **Prototype/Spike:** Build minimal proof-of-concept for best candidate
2. **Community:** Post question to [forum/discord/github discussions]
3. **Version check:** Verify exact version compatibility with our stack
4. **Alternative scope:** Narrow or broaden the original question
```

#### Evidence (`docs/research/evidence/<topic>/`)

`sources.json`:
```json
{
  "topic": "<topic>",
  "collected": "YYYY-MM-DD",
  "sources": [
    {
      "id": "<unique-id>",
      "title": "<title>",
      "url": "<url>",
      "type": "academic|product|blog|official|news",
      "date": "YYYY",
      "confidence": "high|medium|low",
      "keyClaim": "<one-line summary>",
      "usedIn": ["report:<topic>", "brief:<topic>"]
    }
  ]
}
```

`notes.md`: Raw notes, unprocessed observations, screenshots.

#### Code Paths (`docs/research/code-paths/`)

When iterative deep-dive is run, also create:

`docs/research/code-paths/<topic>-trace.md`:

```markdown
# <Topic> — Convergence Trace

## Iteration 1
**Hypothesis:** [approach proposed]
**Search queries:** [...]
**Sources found:** N
**Confidence after:** Low|Medium|High
**Decision:** Continue / Converge

## Iteration 2
**Hypothesis:** [refined approach]
**Search queries:** [...]
**Sources found:** N
**Confidence after:** Low|Medium|High
**Decision:** Continue / Converge

...

## Final Verdict
**Status:** CONFIRMED | PROBABLE | UNRESOLVED
**Iterations:** N
**Time spent:** [estimate]
```

### Phase 4: Wire into DevOps

#### 4a. Update Research Library

```bash
# Always update these after producing research:
# 1. INDEX.md — add new entry
# 2. FRESHNESS.md — add with today's date
# 3. CROSS-REF.md — link to any ADRs/units/goals
# 4. code-paths/ — if convergence achieved, add path file
```

#### 4b. Unit-Linked Research

If research is for a specific unit:
1. Update tracker: `<unit> research: ✅ <brief-name>`
2. Close gap if one existed: `docs/research/gaps/GAP-NNN.md` → RESOLVED
3. Update CROSS-REF.md: Unit → Research mapping

#### 4c. ADR-Linked Research

If research is for an ADR:
1. Edit ADR markdown, add `## Research` section
2. Link to brief: `[brief](../research/briefs/<topic>-brief.md)`
3. Include: key findings, confidence, source count
4. Update CROSS-REF.md: ADR → Research mapping

#### 4d. Gap-Triggered Research

If triggered by `roadmap --discover`:
1. Research the gap topic
2. Mark gap as RESOLVED in `docs/research/gaps/`
3. If gap maps to a unit, update tracker

## Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `bun run devops research topic <name>` | Full research cycle | report + brief + evidence |
| `bun run devops research brief <name>` | Generate brief from existing report | brief only |
| `bun run devops research for-unit <id>` | Check/provide research for a unit | brief or gap |
| `bun run devops research for-adr <id>` | Check/provide research for an ADR | brief attachment |
| `bun run devops research freshness` | Flag stale reports | FRESHNESS.md update |
| `bun run devops research scan` | Rebuild INDEX.md from files | INDEX.md |
| `bun run devops research gaps` | List open research gaps | gaps list |
| `bun run devops research deep-dive <topic>` | Iterative convergence to workable code | code path brief |
| `bun run devops research code-path <topic>` | Show confirmed code paths for topic | code-paths listing |
| `bun run devops research converge <topic>` | Force convergence check on existing research | convergence verdict |

## Integration with DevOps Invariants

### A5: Deep Research for CREATE Units (Hard Block)

**Rule:** CREATE units must have a brief in `docs/research/briefs/` before `in_progress`.

**Check:**
```
If unit.classification = CREATE:
  docs/research/briefs/<topic>-brief.md must exist
  Brief confidence must be High or Medium
```

**Enforced by:** `bun run devops gate` → invariant check → gate fails if missing.

### A6: ADR Research Evidence (Hard Block)

**Rule:** ADRs must have `## Research` section with brief link before DECIDED.

**Check:**
```
docs/decisions/ADR-NNN-title.md must contain:
  ## Research section with link to docs/research/briefs/
```

**Enforced by:** `bun run devops decision decide` → invariant check.

### A7: Research Freshness Gate (Hard Block)

**Rule:** Reports >6 months old must be re-verified within 3 months.

**Check:**
```
If report.date > 6 months ago:
  Must have lastVerified within 3 months
  OR must be in stale/ with replacement
```

**Enforced by:** `bun run devops gate` → freshness check.

## Integration with Workflows

### Workflow 1: Implement a Unit

```
Step 3a: Check CROSS-REF.md for existing research
  → If exists: read brief, use in implementation
  → If not: check gaps/ for pending research
  → If gap: run `bun run devops research topic <topic>`
  → If no gap: create gap, run research, then proceed
```

### Workflow 2: Make an Architecture Decision

```
Step 2: bun run devops research for-adr <adr-id>
  → Check if research exists for this decision topic
  → If no research: MUST run research before proceeding
Step 3: Attach research brief to ADR ## Research section
```

### Workflow 3: Discover and Onboard New Units

```
Step 1: bun run devops roadmap --discover
  → NOW also produces docs/research/gaps/DISCOVERED-GAPS.md
Step 2: For each gap that is research-only → run research
```

### Workflow 4: Goal Review

```
Step 3: bun run devops goals progress
  → Research coverage % now included in goal dashboard
```

### Workflow 5: Quality Assurance

```
bun run devops gate
  → NEW CHECK: research freshness in gate output
  → NEW CHECK: CREATE units have briefs (A5)
```

## Quality Rules

1. **Every claim needs a source.** No unsourced assertions.
2. **Cross-reference.** Single source = flag as unverified.
3. **Recency matters.** Prefer sources from last 12 months.
4. **Acknowledge gaps.** If sub-question couldn't be answered, say so.
5. **No hallucination.** If you don't know, say "insufficient data found."
6. **Separate fact from inference.** Label estimates, projections, opinions.
7. **Confidence scoring.** Every report/brief must include confidence level.
8. **Code convergence honesty.** Never claim CONFIRMED without:
   - Working code example from a source
   - Compatibility verified with project stack
   - No known blockers from issues/changelogs
9. **Convergence transparency.** Always report:
   - How many iterations were run
   - What approaches were considered
   - Why rejected approaches were rejected
10. **Fail-forward on UNRESOLVED.** When convergence fails, provide:
    - Clear next step (prototype, spike, community ask)
    - All explored paths so someone else can pick up
    - Specific questions to answer in the next attempt

## Key Invariants

- **Research before implementation.** Never start coding CREATE units without a brief.
- **Brief is the gate currency.** Full reports are for depth; briefs are for decisions.
- **Freshness is enforced.** Stale research blocks new implementations.
- **Traceability is mandatory.** Every research artifact links to what it informs.
- **User wins conflicts.** When AI recommendation disagrees with user, user wins.
- **Code paths are evidence-based.** Confirmed paths require cited working examples.
- **Max 6 iterations.** Convergence loop caps at 6 to prevent infinite investigation.
- **Convergence is optional.** Not all research needs code convergence — only when explicitly requested or when research is for a CREATE unit with complex integration.