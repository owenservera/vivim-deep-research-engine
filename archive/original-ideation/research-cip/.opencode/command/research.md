---
description: Run the multi-agent deep-research process against the framed CIP problem. Reads FRAMING.md and drives generator/extender/validator/literature/blindspot/synthesizer subagents through the verification loop.
---

Read FRAMING.md. This is a hard, open-ended CIP problem (target under `C:\0-BlackBoxProject-0\index`). Take a real stab at it.

If FRAMING.md has a "Codebase / how to run checks" section, make sure generator and validator subagents actually read that CIP code and RUN checks against it — this process is only as good as the evidence it executes, not the reasoning it does. For CIP the harness is **Python**, not bun: `python repros/cip-*.py` (see `repros/README.md`).

Start broad: generate and cheaply test as many distinct approaches as you can using generator subagents — expect most to fail, and log every failure to deadends.md so nothing gets re-tried. Use a literature subagent early to seed FRAMING.md with relevant prior work from `C:\0-BlackBoxProject-0\index\docs\`, `ontology.json`, `config.default.toml`.

Once you have anything that looks non-dead, use extender subagents to push it further, then validator subagents to adversarially attack it before treating it as real. Nothing gets called a result until a validator has actually tried to break it, re-derived it independently, RUN an executed Python check against the real CIP code under `C:\0-BlackBoxProject-0\index`, and a literature subagent has checked it isn't already known. A SURVIVED VALIDATION verdict means no subagent could break it — it is not the same as human expert confirmation, and should never be described as "verified."

Run the budget check periodically and treat its output as a real decision point, not a status update to skim past:
```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check_budget.ps1
# or: bun run scripts/research-loop.ts status
```

Once there's a real map of what's been tried, run a blindspot subagent to check whether the whole fleet is missing some category of approach (Windows paths, vector cache vs FTS, audit findings lifecycle, watcher races, etc.), and actually act on what it finds rather than filing it away.

If it's looking bleak, that's normal — keep going, try recombining approaches, and don't give up just because the first pass didn't work. The CIP codebase is large (80+ modules under lib/cipkg) — broad exploration before deep fan-out is essential.

Report back with what you tried, what failed and why, and anything that survived validation (labeled honestly as pending human review, not as final).

