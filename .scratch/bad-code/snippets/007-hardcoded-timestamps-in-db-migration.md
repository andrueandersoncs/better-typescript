# Hardcoded timestamps and raw SQL in database migration

- ID: 007
- Added: 2026-09-02
- Source: paste
- Path: none

## Why it is bad

- Hardcoded timestamp literals (`"2026-01-15T09:00:00.000Z"`) instead of runtime-generated values like `new Date().toISOString()`. This breaks reproducibility and audit trails when the migration runs at a different time.
- Manual SQL with many positional placeholders (`?`) creates brittle, unmaintainable code prone to column/argument mismatches.
- Direct `JSON.stringify()` into database columns bypasses schema validation and makes future schema evolution difficult.
- Transaction block is an immediately invoked function expression (IIFE) wrapping callbacks, making error propagation and cleanup harder to follow.

## Code

```ts
const db = new Database(databasePath);
const now = "2026-01-15T09:00:00.000Z";
db.transaction(() => {
  db.prepare(`INSERT INTO goals(id,title,description,status,mode,controlState,publicationState,priority,launchMode,createdAt,updatedAt,closedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(input.legacyRows.goal.id, input.legacyRows.goal.title, "", input.legacyRows.goal.status, "finite", "stopped", "published", 0, "review", now, now, now);
  db.prepare(`INSERT INTO plans(id,goalId,title,description,status,kind,publicationState,createdAt,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(input.legacyRows.plan.id, input.legacyRows.plan.goalId, input.legacyRows.plan.title, input.legacyRows.plan.description, "completed", "execution", input.legacyRows.plan.publication, now, now);

  const insertTask = db.prepare(`INSERT INTO tasks(
    id,planId,title,description,status,attempt,agentSessionId,output,kind,publicationState,
    createdAt,updatedAt,startedAt,completedAt,integrationStatus,integrationMergeRevision,integrationCompletedAt
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  Array.forEach(input.legacyRows.tasks, (task) => {
    insertTask.run(task.id, task.planId, task.title, "", task.status, 1, `session:${task.id}`, "", "execution", "published", now, now, now, now, null, null, null);
  });
  insertTask.run(input.legacyRows.finalization.taskId, input.legacyRows.plan.id, "Finalization", "", "succeeded", 1, `session:${input.legacyRows.finalization.taskId}`, "", "goal-finalization", "published", now, now, now, now, "integrated", input.legacyRows.finalization.integrationRevision, now);
  db.prepare(`UPDATE tasks SET workspacePath=?, workspaceRetentionEvidence=?, integrationStatus='integrated', integrationCommitRevision=?, dispatchId=?, runToken=? WHERE id=?`).run(
    `/legacy/workspaces/${input.legacyRows.retainedEvidence.workspaceId}`,
    JSON.stringify({ id: input.legacyRows.retainedEvidence.workspaceId, retained: true }),
    input.legacyRows.retainedEvidence.integrationId,
    `legacy-alias:queue:${evidenceTask.id}`,
    `legacy-run:${evidenceTask.id}`,
    evidenceTask.id,
  );
  db.prepare("INSERT INTO task_output_chunks(taskId,attempt,sequence,content,createdAt) VALUES(?,?,?,?,?)").run(
    evidenceTask.id, 1, 1, JSON.stringify({ id: input.legacyRows.retainedEvidence.outputId, content: "legacy output" }), now,
  );
  db.prepare(`INSERT INTO task_interactions(id,taskId,attempt,runToken,sequence,kind,content,correlationId,state,createdAt)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
    input.legacyRows.retainedEvidence.interactionId, evidenceTask.id, 1, `legacy-run:${evidenceTask.id}`, 1,
    "operator-message", "Legacy interaction", input.legacyRows.retainedEvidence.interactionId, "resolved", now,
  );
  db.prepare("INSERT INTO task_controls(id,taskId,sequence,runToken,kind,payload,createdAt) VALUES(?,?,?,?,?,?,?)").run(
    `legacy-alias:control:${evidenceTask.id}`, evidenceTask.id, 1, `legacy-run:${evidenceTask.id}`, "steer", "{}", now,
  );
  db.prepare("UPDATE plans SET finalTaskId=? WHERE id=?").run(input.legacyRows.plan.finalTaskId, input.legacyRows.plan.id);

  Array.forEach(input.legacyRows.dependencies, (dependency) => {
    db.prepare("INSERT INTO task_dependencies(taskId,dependsOnTaskId) VALUES(?,?)").run(dependency.dependentTaskId, dependency.prerequisiteTaskId);
  });
  db.prepare(`INSERT INTO goal_runs(id,goalId,triggerType,status,outcome,attempt,createdAt,startedAt,completedAt,updatedAt)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(input.legacyRows.goalRun.id, input.legacyRows.goalRun.goalId, "manual", input.legacyRows.goalRun.status, "completed", input.legacyRows.goalRun.sequence, now, now, now, now);
  db.exec(`
    DROP TABLE unified_task_events;
    DROP TABLE legacy_task_evidence;
    DROP TABLE unified_task_dependencies;
    DROP TABLE verification_phases;
    DROP TABLE verification_attempts;
    DROP TABLE task_attempts;
    DROP TABLE verification_methods;
    DROP TABLE unified_tasks;
    DELETE FROM effect_domain_migrations WHERE migration_id=37;
  `);
})();
db.close();
```

## Analysis

### Shape: Hardcoded current timestamp

- Observable shape: An ISO timestamp literal is assigned to `now` and reused as migration creation and update times.
- Existing rules: none
- Pattern: [hardcoded-timestamp-string-literal](../patterns/hardcoded-timestamp-string-literal.md)
- Emergence: attached
- Reason: The existing pattern owns this AST-detectable operational-time shape and its injected-clock or runtime-time replacement.

### Shape: Long positional SQL value lists

- Observable shape: SQL `VALUES` clauses contain up to 17 positional `?` placeholders paired with long `.run(...)` argument lists.
- Existing rules: none
- Pattern: [bloated-sql-placeholder-list](../patterns/bloated-sql-placeholder-list.md)
- Emergence: attached
- Reason: The existing pattern owns this detectable positional-binding shape and its named-field or typed-query replacement.

### Shape: Unvalidated JSON database writes

- Observable shape: `JSON.stringify(...)` results are passed directly into database statement arguments.
- Existing rules: `prefer-effect-schema-constructor` checks raw object construction, not persistence encoding.
- Pattern: none
- Emergence: no-pattern
- Reason: A generic AST check cannot determine whether the database column expects validated domain data or intentionally opaque JSON. The replacement depends on the column schema.

### Shape: Immediately invoked transaction wrapper

- Observable shape: The function returned by `db.transaction(...)` is invoked immediately with `()`.
- Existing rules: `no-callbacks` checks callback-style void API declarations, not calls to transaction wrappers.
- Pattern: none
- Emergence: no-pattern
- Reason: This is the database API's transaction invocation shape rather than a direct IIFE. A replacement requires library-specific transaction semantics.
