/** Shared D1 admission fences for the legacy DO check engine. No sandbox calls. */
import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "./worker";
import type { DevelopmentRun, StartDevelopmentRunResult } from "./development-contract";
import { CodingError } from "./coding-api";
export interface CheckReservationBoundary {
  verify(taskId:string,fence:string):Promise<boolean>;
  recover(taskId:string,runId:string):Promise<string|null>;
  release(taskId:string,fence:string,runId:string):Promise<void>;
}
export function checkBoundary(db:D1Database):CheckReservationBoundary {
  return {
    async verify(taskId,fence) {
      return !!await db.prepare("SELECT owner FROM execution_reservations WHERE task_id=? AND owner=? AND kind IN ('check','legacy')").bind(taskId,fence).first();
    },
    async recover(taskId,runId) {
      const fence=`legacy:${runId}`;
      // A deleted task's old coordinator cannot safely acquire a fresh environment.
      // Its unresolved orphan remains an explicit inventory blocker.
      await db.prepare(`INSERT OR IGNORE INTO execution_reservations SELECT id,'legacy',?,1,'blocked' FROM tasks WHERE id=?
        AND NOT EXISTS(SELECT 1 FROM execution_reservations WHERE kind='coding') RETURNING owner`).bind(fence,taskId).first();
      return await this.verify(taskId,fence)?fence:null;
    },
    async release(taskId,fence,runId) {
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO check_evidence VALUES(?,?)").bind(taskId,runId),
        db.prepare("UPDATE check_requests SET run_id=? WHERE task_id=? AND fence=?").bind(runId,taskId,fence),
        db.prepare("DELETE FROM execution_reservations WHERE task_id=? AND owner=? AND kind IN ('check','legacy')").bind(taskId,fence),
      ]);
    },
  };
}
export async function startCheck(env:Env,taskId:string,requestId:string):Promise<StartDevelopmentRunResult> {
  if(env.TASKR_LOCAL_CODING==="1") throw new CodingError("Check admission is disabled in coding mode; retained history remains readable.",503);
  const runner=env.DEVELOPMENT_RUNNERS!.getByName(taskId);
  // Production coordinators have lookup/inventory. An old deployment without
  // this protocol must drain before it can participate; never call unsafe start.
  if(!runner.lookup || !runner.inventory) throw new CodingError("The check coordinator needs the shared reservation protocol.",503);
  const previous=await runner.lookup(requestId);
  if(previous) return {run:previous,created:false};
  const inventory=await runner.inventory();
  const existing=await env.DB.prepare("SELECT fence FROM check_requests WHERE task_id=? AND request_id=?").bind(taskId,requestId).first<{fence:string}>();
  const held=await env.DB.prepare("SELECT owner,kind FROM execution_reservations WHERE task_id=?").bind(taskId).first<{owner:string;kind:string}>();
  if(held && held.kind!=="check" && held.kind!=="legacy") throw new CodingError("A coding run holds this task's reservation.",409);
  if(inventory.fence && !held) throw new CodingError("Prior check fence was released; wait for coordinator retirement before starting another check.",409);
  const fence=existing?.fence??held?.owner??inventory.fence??(inventory.activeRunId?`legacy:${inventory.activeRunId}`:crypto.randomUUID());
  if(existing && (!held || held.owner!==fence)) throw new CodingError("Unknown old check admission is fenced; reconcile its original coordinator.",409);
  await env.DB.prepare(`INSERT OR IGNORE INTO execution_reservations SELECT id,'check',?,1,'pending' FROM tasks WHERE id=? AND archived_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM execution_reservations WHERE kind='coding')
    AND NOT EXISTS(SELECT 1 FROM coding_workspace WHERE maintenance=1) RETURNING owner`).bind(fence,taskId).first();
  if(!await checkBoundary(env.DB).verify(taskId,fence)) throw new CodingError("Execution reservation changed.",409);
  // Durable before the RPC. Unknown acceptance retains its reservation forever
  // until the owning coordinator confirms cleanup, not until a timeout expires.
  const saved=await env.DB.prepare(`INSERT OR IGNORE INTO check_requests SELECT ?,?,?,NULL
    WHERE EXISTS(SELECT 1 FROM execution_reservations WHERE task_id=? AND owner=?)
    AND NOT EXISTS(SELECT 1 FROM coding_workspace WHERE maintenance=1) RETURNING fence`).bind(taskId,requestId,fence,taskId,fence).first();
  if(!saved && !existing) throw new CodingError("Check admission conflicted; reconcile the same request key.",409);
  let result:StartDevelopmentRunResult;
  try { result=await runner.start(taskId,requestId,fence); }
  catch {
    await env.DB.prepare("UPDATE execution_reservations SET cleanup='blocked' WHERE task_id=? AND owner=? RETURNING owner").bind(taskId,fence).first();
    throw new CodingError("Check acceptance is uncertain; reservation retained. Retry the same request key.",503);
  }
  await env.DB.batch([
    env.DB.prepare("UPDATE check_requests SET run_id=? WHERE task_id=? AND request_id=? AND fence=?").bind(result.run.id,taskId,requestId,fence),
    env.DB.prepare("INSERT OR IGNORE INTO check_evidence VALUES(?,?)").bind(taskId,result.run.id),
  ]);
  return result;
}
export interface CheckInventory { activeRunId:string|null; fence:string|null; runs:DevelopmentRun[] }
