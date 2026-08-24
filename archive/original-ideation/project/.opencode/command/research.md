---
description: Run the multi-agent deep-research process against the framed problem. Reads FRAMING.md and drives generator/extender/validator/literature/blindspot/synthesizer subagents through the verification loop.
---

Read FRAMING.md. This is a hard, open-ended problem. Take a real stab at it.

If FRAMING.md has a "Codebase / how to run checks" section, make sure generator
and validator subagents actually read that code and run checks against it — this
process is only as good as the evidence it executes, not the reasoning it does.

Start broad: generate and cheaply test as many distinct approaches as you can
using generator subagents — expect most to fail, and log every failure to
deadends.md so nothing gets re-tried. Use a literature subagent early to seed
FRAMING.md with relevant prior work.

Once you have anything that looks non-dead, use extender subagents to push it
further, then validator subagents to adversarially attack it before treating
it as real. Nothing gets called a result until a validator has actually tried
to break it, re-derived it independently, run an executed check against the
target, and a literature subagent has checked it isn't already known. A SURVIVED
VALIDATION verdict means no subagent could break it — it is not the same as
human expert confirmation, and should never be described as "verified."

Run scripts/check_budget.sh periodically and treat its output as a real
decision point, not a status update to skim past.

Once there's a real map of what's been tried, run a blindspot subagent to check
whether the whole fleet is missing some category of approach, and actually act
on what it finds rather than filing it away.

If it's looking bleak, that's normal — keep going, try recombining approaches,
and don't give up just because the first pass didn't work.

Report back with what you tried, what failed and why, and anything that
survived validation (labeled honestly as pending human review, not as final).
