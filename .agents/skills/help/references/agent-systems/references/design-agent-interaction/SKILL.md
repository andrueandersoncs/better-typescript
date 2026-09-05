---
name: design-agent-interaction
description: Design event-driven agent interaction across voice, computer use, visual environments, or robotics.
---

# Design Agent Interaction

Design interaction around time as well as modality. The shared primitives are events, fresh observations, safe points, cancellation, and separate fast and slow paths.

## Method

1. List observation channels, action channels, event sources, latency targets, and irreversible actions.
2. Represent incoming activity as structured events with source, channel, content, timestamp, and task context.
3. Separate initiating work from receiving its result. Return a task identifier, then deliver completion as a later event.
4. Define safe points where the agent may inspect events, cancel, preempt, or revise its plan.
5. Route events by urgency and dependency:
   - Interrupt for urgent events that invalidate current work.
   - Queue routine events.
   - Run small independent inquiries concurrently.
6. Separate a fast interaction path from slow deliberation. Let the fast path preserve conversational or control responsiveness while the slow path plans.
7. After every action, obtain a fresh observation and reconcile it with the expected state.
8. Put safety-critical controls in an independent controller with permission gates and physical or programmatic limits.
9. Give each real-world channel an isolated execution environment and virtual identity. Track cross-channel delivery as explicit states such as queued, sent, acknowledged, failed, and canceled.

## Modality rules

- Voice: support streaming recognition and speech, barge-in, cancellation, and explicit turn state.
- Computer use: prefer semantic element identifiers; use visual coordinates when semantics are unavailable; re-observe after each action.
- Dynamic scenes: distinguish predictions from observations. A world model may guide action, while reality verifies it.
- Robotics: expose high-level skills backed by local closed loops; choose action chunk length to balance smoothness and reaction time.

Source: *Building AI Agents*, Chapter 6, “Agent Interaction.”
