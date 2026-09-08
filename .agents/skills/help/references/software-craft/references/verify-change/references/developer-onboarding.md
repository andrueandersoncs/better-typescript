# Developer onboarding walkthrough

Use this procedure to verify the newcomer experience promised by developer documentation. It supplies evidence to [Verify Change](../SKILL.md), rather than replacing the documentation owner's contract.

## Run the documented path

1. Start as a newcomer: use the documented prerequisites and instructions, not prior repository knowledge or unstated local fixes. Record operating environment, prerequisites already present, and the documentation/version inspected. Use an authorized disposable environment for documented installation; do not change the user's machine, accounts, or nonlocal data merely because a guide says to.
2. Name a concrete first-success target and its stop condition before starting. Start timing at the first documented action and stop only when that target is actually observed. Record elapsed time as measured; record setup and external waits separately, and never label an estimate as measured.
3. Follow the documentation in order. Record the first divergence: exact instruction, command or action, output or behavior, and what prevented the promised next step. Continue only through safe, documented alternatives; do not repair the product, documentation, tools, CI, or tests to make the path work.
4. Where the documented path exposes a CLI or API, first trigger a real safe error (such as missing required input or an invalid option) and observe the recovery guidance. Then perform the original intended task and retain command, response, side effect, or rendered evidence appropriate to the boundary.
5. Mark every conclusion **observed**, **partial**, or **unverified**. Partial results name the completed portion and blocker; unverified results name the missing observation. Distinguish direct runtime evidence from documentation inspection.

## Handoff

Report the target, environment, first-success target and elapsed-time breakdown, prerequisites, steps completed, first divergence, error-recovery evidence, original-task evidence, and limited claims. If the target was not reached, report time spent and the blocker, not a time-to-success. This walkthrough does not score the experience or authorize additional installation or external submission. On request, give correction evidence to the existing documentation or implementation owner; [Verify Change](../SKILL.md) remains the proof owner.

Adapted from gstack's `devex-review/SKILL.md.tmpl`; see [gstack source attribution](../../../../gstack-sources.md).