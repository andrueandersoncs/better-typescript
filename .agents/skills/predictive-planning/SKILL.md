---
name: predictive-planning
description: Create and improve plans as testable forecasts with explicit outcomes, probabilities, assumptions, evidence checkpoints, trigger rules, and calibration. Use when creating, reviewing, stress-testing, or updating a plan, estimate, roadmap, project proposal, or strategy.
---

# Predictive Planning

Treat a plan as a **forecast plus a policy**:

> If we take these actions, under these assumptions, we expect this outcome within these time and cost limits. If reality differs, we will respond in a defined way.

Use only the detail that can change a decision.

## Route

For routine, reversible work, use this minimal forecast-policy and stop:

> If [action], [owner] has [probability]% chance of [scoreable outcome] by [date]. If [trigger], then [response].

For work with meaningful stakes or uncertainty, use the full method. First establish this operating contract:

- Store each timestamped forecast and revision in one durable record.
- Freeze the success event, measurement rule, and evidence source before the decision.
- Name the forecast author and the decision owner who can apply response rules.
- Schedule the review before the next expensive or irreversible commitment.
- Assign the forecast to a group of comparable forecasts made at a similar time horizon.
- When approval incentives could distort the estimate, obtain an independent forecast before choosing the decision forecast.

If a control is missing, make establishing it the first action instead of inventing precision.

## Method

### 1. Define the predicted result

Define one scoreable success event: the outcome reaches a stated threshold by a stated deadline without exceeding a stated cost or effort limit. Attach the probability of success to that complete event.

Also state:

- The owner
- P50 and P90 completion dates when timing is uncertain
- P50 and P90 cost or effort when cost is uncertain
- Why the proposed actions should produce the outcome

Forecast completion date and cost separately. P50 means a 50% chance of finishing by the date or within the cost estimate. P90 means a 90% chance, so a P90 date or cost cannot be earlier or lower than P50.

These are separate forecasts: two P90 estimates do not imply a 90% chance of meeting both. The probability of a success event requiring several conditions cannot exceed the probability of any required condition.

Describe the result rather than the activity. Replace “ship a dashboard” with the change the dashboard should cause.

### 2. Establish the probability basis

Find comparable past work. Use its actual duration, cost, and success rate as the starting point. Record each adjustment and the evidence for it.

When comparable evidence is unavailable, label the forecast as judgment-based. Do not present unsupported precision as measured knowledge. Record any independent forecast separately before choosing the probability used for the decision.

### 3. Expose critical uncertainty

Record only assumptions and dependencies that are both important and uncertain. State the evidence and confidence for each one.

### 4. Test the most valuable uncertainty first

Prioritize a test when the assumption is important and uncertain, the result could change the plan, and the test is cheap. Put the best such test before expensive or irreversible work.

Sequence work by useful information gained, not by convenience.

### 5. Choose the policy and actions

Before committing, compare the proposed policy’s expected benefit, cost, and downside with doing nothing and the best practical alternative. Choose the policy with the best supported tradeoff.

List its smallest complete sequence of actions. Connect each action to the assumption it tests, evidence it creates, or result it causes. Remove work that does none of these.

### 6. Turn milestones into predicted evidence

Give each checkpoint an observable expected state, not only a task or date.

For example:

> By Tuesday, five users can complete onboarding unaided, with at least four succeeding in under three minutes.

### 7. Define response rules in advance

For each important signal, state the response:

> If [observed condition], then [continue, revise, reduce scope, pause, or stop].

Choose thresholds before observing the result. Name the person authorized to apply each response and when they must decide.

### 8. Update the forecast

At each checkpoint:

1. Compare predicted evidence with actual evidence.
2. Identify the assumption that changed.
3. Update the probability and the P50 and P90 completion and cost estimates.
4. Continue, change course, or stop according to the response rules.
5. Append the evidence and revision to the durable record without replacing earlier forecasts.

### 9. Learn from prediction error

Afterward, compare predicted and actual outcome, duration, cost, and failed assumptions. Score the frozen forecast used for the decision; keep later revisions separate and compare forecasts made at similar time horizons.

For decimal probability `p`, set `y = 1` when the complete success event occurs and `y = 0` otherwise. Calculate the Brier score `BS = (p - y)²`; lower is better. Across repeated forecasts, check that events forecast near 70% occur about 70% of the time, and that actual completion dates and costs fall at or below P50 and P90 estimates about 50% and 90% of the time.

Use recurring errors to update local base rates and future estimates. Judge forecast quality separately from outcome quality. One result cannot establish calibration: a good probabilistic forecast can fail, and a poor plan can succeed through luck.

## Output

For routine work, output the minimal forecast-policy from **Route**. For consequential uncertainty, use the relevant sections of this template:

```markdown
# [Plan name]

## Operating controls
- Durable record:
- Forecast frozen at:
- Measurement rule and evidence source:
- Forecast author:
- Decision owner and authority:
- Calibration group and forecast horizon:
- Independent forecast when incentives require one:

## Forecast
- Scoreable success event: [outcome threshold] by [deadline] within [cost or effort limit]
- Probability of success:
- Probability basis and adjustments:
- Owner:
- P50 / P90 completion:
- P50 / P90 cost or effort:
- Comparable past cases:
- Causal rationale:

## Policy choice
- Proposed policy: [expected benefit, cost, and downside]
- Doing nothing: [expected benefit, cost, and downside]
- Best practical alternative: [expected benefit, cost, and downside]
- Decision:

## Critical assumptions
- [Assumption]: [evidence, confidence, or dependency]

## Cheapest next test
- Belief being tested:
- Test:
- Expected evidence:

## Actions
1. [Action] — [owner] — [expected effect or evidence]

## Milestones
- [Checkpoint]: [date or range] — [expected evidence]

## Response rules
- If [condition], then [authorized owner] takes [response] by [decision time].

## Review and scoring
- Next review before commitment:
- Outcome scoring date:
- Actual outcome source:
- Brier score when resolved:
```

For an existing plan, retain its useful content while converting activities, dates, and assumptions into explicit forecasts and response rules.
