---
name: optimize-system
description: Improve measured software performance by attributing one bottleneck, changing one cause, and remeasuring under comparable conditions. Use when a measured budget or user journey misses its target and profiling has identified the owning cost.
---

# Optimize System

## Inputs

The user-visible performance outcome, explicit budget, representative environment, measured miss, and evidence identifying the owning cost.

## Method

1. Define the user-visible outcome and budget: latency, throughput, frame time, memory, startup, energy, bundle, or cost.
2. Capture a representative baseline and normal run variance in the target environment. Include field evidence when available.
3. Profile the complete path and localize the dominant cost: CPU, I/O, query, allocation/copy, rendering, network, GPU, contention, or lifecycle leak.
4. State one causal hypothesis. Change the smallest owning mechanism; avoid unrelated cleanup.
5. Remeasure with the same workload, device, build mode, cache state, and tool. Compare against both the budget and variance.
6. Keep only changes with a material attributed improvement and no correctness, accessibility, security, or maintenance regression. Revert neutral complexity.
7. Check long-session behavior, hidden/offscreen work, teardown, cold and warm paths, and supported slow devices when relevant.
8. Record the successful evidence and useful failed attempts. Add a regression budget where a plausible future change could silently restore the cost.

## Output

One attributed performance change with comparable before-and-after measurements and the resulting budget status.

## Done

The target metric improves beyond normal variance in a representative scenario, the user-visible budget is met or the remaining gap is explicit, and the causal explanation matches the profile.