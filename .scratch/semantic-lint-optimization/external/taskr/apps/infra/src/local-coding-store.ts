import { constants } from "node:fs";
import { lstat, mkdir, open, rename, unlink, rmdir } from "node:fs/promises";
import { dirname, join, resolve, parse } from "node:path";
import { randomUUID } from "node:crypto";
import { agentConfig, sourceReceipt, runDiagnostic, runResult, runnerEvent, object, text, integer, uuid, runStatuses,
  type CodingRun, type RunnerEvent, type CleanupStatus, type ProviderOutcome, type RunDiagnostic, type RunResult } from "../../../packages/coding-contract/src/index";

export interface TaskOutcome {
  status: "succeeded" | "failed" | "cancelled" | "interrupted";
  cleanup: CleanupStatus; error: string; providerOutcome: ProviderOutcome; diagnostic: RunDiagnostic | null; result: RunResult | null;
}
export interface ControllerEntry {
  run: CodingRun;
  /** The trusted filtered bundle directory, never a task-controlled checkout. */
  snapshotDirectory: string;
  phase: "claimed" | "started" | "finished" | "closed";
  pending: RunnerEvent | null;
  outcome: TaskOutcome | null;
  /** Local control/gateway/tool cleanup proved; provider termination/usage NOT proved. */
  cleanupDisposition: "provider-only-uncertainty-after-owned-cleanup" | null;
  effectIntents: {effectId:string;kind:"work"|"cleanup";runtimeVersion:number;authorized:boolean}[];
}
export interface ControllerLedger { version: 1; claimPending: boolean; entries: ControllerEntry[] }
export interface ControllerStore {
  read(): ControllerLedger;
  write(ledger: ControllerLedger): Promise<void>;
  close(): Promise<void>;
}
const bad = (): never => { throw new Error("Invalid local coding ledger or API data."); };
const date = (v: unknown) => { const s=text(v,40,true); if(!Number.isFinite(Date.parse(s)))bad(); return s; };
const diagnosticReason = (value: unknown): unknown => {
  if(!value||typeof value!=="object"||Array.isArray(value))return value;
  const diagnostic=(value as Record<string,unknown>).diagnostic;
  return diagnostic&&typeof diagnostic==="object"&&!Array.isArray(diagnostic)&&!("gatewayReason" in diagnostic)
    ?{...value,diagnostic:{...diagnostic,gatewayReason:"policy"}}:value;
};
export function decodeCodingRun(value: unknown): CodingRun {
  const legacy=value && typeof value==="object"&&!Array.isArray(value)&&!("diagnostic" in value)?{...value,diagnostic:null}:value;
  const v=object(diagnosticReason(legacy),["id","taskId","taskRevision","agent","source","status","version","generation","createdAt","updatedAt","finishedAt","cleanup","error","progress","providerOutcome","diagnostic","taskSnapshot","result","review","cancelRequested","runtimeVersion","cancellation"]);
  const t=object(v.taskSnapshot,["id","title","description","status","priority","label","assignee","executor","acceptanceCriteria","reviewer","createdAt","updatedAt","revision","archivedAt"]);
  if(!["backlog","todo","in-progress","review","blocked","done"].includes(t.status as string) || !["urgent","high","medium","low"].includes(t.priority as string) || !["Feature","Bug","Design","Improvement"].includes(t.label as string) || !["agent","human"].includes(t.executor as string))bad();
  const task={...t,id:text(t.id,100,true),title:text(t.title,500,true),description:text(t.description,4000),assignee:text(t.assignee,100),acceptanceCriteria:text(t.acceptanceCriteria,4000),reviewer:text(t.reviewer,100),createdAt:date(t.createdAt),updatedAt:date(t.updatedAt),revision:integer(t.revision),archivedAt:t.archivedAt===null?null:date(t.archivedAt)} as CodingRun["taskSnapshot"];
  if(!runStatuses.includes(v.status as CodingRun["status"]) || !["pending","complete","blocked"].includes(v.cleanup as string) || !["not-started","unknown","completed"].includes(v.providerOutcome as string) || typeof v.cancelRequested!=="boolean")bad();
  let review: CodingRun["review"]=null;
  if(v.review!==null){const r=object(v.review,["id","resultDigest","decision","note","createdAt","reviewer","expectedTaskRevision","inputTaskRevision","acknowledgeStaleTask"]);if(!["accepted","rejected"].includes(r.decision as string)||r.reviewer!=="local-operator"||typeof r.acknowledgeStaleTask!=="boolean")bad();review={id:text(r.id,100,true),resultDigest:text(r.resultDigest,71,true),decision:r.decision as "accepted"|"rejected",note:text(r.note,4000),createdAt:date(r.createdAt),reviewer:"local-operator",expectedTaskRevision:integer(r.expectedTaskRevision),inputTaskRevision:integer(r.inputTaskRevision),acknowledgeStaleTask:r.acknowledgeStaleTask as boolean};}
  let cancellation:CodingRun["cancellation"]=null;
  if(v.cancellation!==null){const c=object(v.cancellation,["requestId","expectedRuntimeVersion","outcome","reason"]);if(!["pending","applied","conflict","noop"].includes(c.outcome as string))bad();cancellation={requestId:uuid(c.requestId),expectedRuntimeVersion:integer(c.expectedRuntimeVersion,0),outcome:c.outcome as NonNullable<CodingRun["cancellation"]>["outcome"],reason:text(c.reason,1000)};}
  const run={runtimeVersion:integer(v.runtimeVersion,0),cancellation,id:uuid(v.id),taskId:text(v.taskId,100,true),taskRevision:integer(v.taskRevision),agent:agentConfig(v.agent),source:sourceReceipt(v.source),status:v.status as CodingRun["status"],version:integer(v.version),generation:integer(v.generation),createdAt:date(v.createdAt),updatedAt:date(v.updatedAt),finishedAt:v.finishedAt===null?null:date(v.finishedAt),cleanup:v.cleanup as CleanupStatus,error:text(v.error,1000),progress:text(v.progress,1000),providerOutcome:v.providerOutcome as ProviderOutcome,diagnostic:v.diagnostic===null?null:runDiagnostic(v.diagnostic),taskSnapshot:task,result:v.result===null?null:runResult(v.result),review,cancelRequested:v.cancelRequested as boolean};
  if(run.taskId!==task.id || run.taskRevision!==task.revision)bad();
  return run;
}
function decodeLedger(raw: unknown): ControllerLedger {
  const v=object(raw,["version","claimPending","entries"]);
  if(v.version!==1||typeof v.claimPending!=="boolean"||!Array.isArray(v.entries)||v.entries.length>1000)bad();
  const entries=(v.entries as unknown[]).map(raw=>{
    const e=object(raw,["run","snapshotDirectory","phase","pending","outcome","cleanupDisposition","effectIntents"]);
    if(!Array.isArray(e.effectIntents)||e.effectIntents.length>1000)bad();
    const effectIntents=(e.effectIntents as unknown[]).map(raw=>{const i=object(raw,["effectId","kind","runtimeVersion","authorized"]);if(!["work","cleanup"].includes(i.kind as string)||typeof i.authorized!=="boolean")bad();return {effectId:uuid(i.effectId),kind:i.kind as "work"|"cleanup",runtimeVersion:integer(i.runtimeVersion,0),authorized:i.authorized as boolean};});
    if(new Set(effectIntents.map(i=>i.effectId)).size!==effectIntents.length)bad();
    if(e.cleanupDisposition!==null&&e.cleanupDisposition!=="provider-only-uncertainty-after-owned-cleanup")bad();
    if(!["claimed","started","finished","closed"].includes(e.phase as string))bad();
    const legacyPending=e.pending===null?null:e.pending&&typeof e.pending==="object"&&!Array.isArray(e.pending)&&!("diagnostic" in e.pending)?{...e.pending,diagnostic:null}:e.pending;
    const pending=diagnosticReason(legacyPending);
    const entry:ControllerEntry={effectIntents,run:decodeCodingRun(e.run),snapshotDirectory:text(e.snapshotDirectory,4096,true),phase:e.phase as ControllerEntry["phase"],pending:pending===null?null:runnerEvent(pending),outcome:null,cleanupDisposition:e.cleanupDisposition as ControllerEntry["cleanupDisposition"]};
    if(!entry.snapshotDirectory.startsWith("/"))bad();
    if(entry.pending&&(entry.pending.runId!==entry.run.id||entry.pending.generation!==entry.run.generation))bad();
    if(e.outcome!==null){const legacy=e.outcome&&typeof e.outcome==="object"&&!Array.isArray(e.outcome)&&!("diagnostic" in e.outcome)?{...e.outcome,diagnostic:null}:e.outcome;const o=object(diagnosticReason(legacy),["status","cleanup","error","providerOutcome","diagnostic","result"]);if(!["succeeded","failed","cancelled","interrupted"].includes(o.status as string)||!["pending","complete","blocked"].includes(o.cleanup as string)||!["not-started","unknown","completed"].includes(o.providerOutcome as string))bad();entry.outcome={status:o.status as TaskOutcome["status"],cleanup:o.cleanup as CleanupStatus,error:text(o.error,1000),providerOutcome:o.providerOutcome as ProviderOutcome,diagnostic:o.diagnostic===null?null:runDiagnostic(o.diagnostic),result:o.result===null?null:runResult(o.result)};}
    return entry;
  });
  if(new Set(entries.map(e=>e.run.id)).size!==entries.length||entries.filter(e=>e.phase!=="closed").length>1)bad();
  return {version:1,claimPending:v.claimPending as boolean,entries};
}
async function syncDirectory(directory: string) {const file=await open(directory,constants.O_RDONLY);try{await file.sync();}finally{await file.close();}}
async function privateFile(path:string):Promise<string>{
  const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const s=await f.stat();if(!s.isFile()||s.nlink!==1||(s.mode&0o077)!==0||s.uid!==process.getuid?.()||s.size>32*1024*1024)bad();return await f.readFile("utf8");}finally{await f.close();}
}
/** One writer. Stale PID locks can be recovered; live owners and corrupt files fail closed.
 * Each replacement fsyncs the file and containing directory before acknowledging it.
 * The tool sandbox never receives this directory, signing keys, or this capability.
 */
export async function openControllerStore(directory: string): Promise<ControllerStore> {
  const root=resolve(directory);let current=parse(root).root;
  for(const part of root.slice(current.length).split("/").filter(Boolean)){current=join(current,part);try{const s=await lstat(current);if(s.isSymbolicLink()||!s.isDirectory())bad();}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;await mkdir(current,{mode:0o700});}}
  const stat=await lstat(root);if((stat.mode&0o077)!==0||stat.uid!==process.getuid?.())throw new Error("Controller store must be private and owned by this user.");
  await syncDirectory(dirname(root));
  const lockPath=join(root,"owner.lock"),token=randomUUID();
  try{await lstat(join(root,"reclaim.lock"));throw new Error("Controller ownership recovery requires an operator audit.");}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  try{
    const previous=JSON.parse(await privateFile(lockPath)) as {pid:number;token:string};
    if(!Number.isSafeInteger(previous.pid)||previous.pid<1||typeof previous.token!=="string")bad();
    try{process.kill(previous.pid,0);throw new Error("Controller store is already owned.");}catch(e){if((e as NodeJS.ErrnoException).code!=="ESRCH")throw e;}
    // A second stale-lock observer must never unlink a new owner's lock.
    // A crash during this tiny reclaim section leaves an explicit audit blocker.
    const gate=join(root,"reclaim.lock");await mkdir(gate,{mode:0o700});
    try{const latest=JSON.parse(await privateFile(lockPath)) as {token:string};if(latest.token!==previous.token)bad();await unlink(lockPath);await syncDirectory(root);}
    finally{await rmdir(gate);}
  }catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  const lock=await open(lockPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  await lock.writeFile(JSON.stringify({pid:process.pid,token}));await lock.sync();await lock.close();await syncDirectory(root);
  let closed=false;let state:ControllerLedger={version:1,claimPending:false,entries:[]};let tail=Promise.resolve();
  const release=async()=>{const owner=JSON.parse(await privateFile(lockPath)) as {token:string};if(owner.token!==token)bad();await unlink(lockPath);await syncDirectory(root);};
  try{try{state=decodeLedger(JSON.parse(await privateFile(join(root,"ledger.json"))));}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}}catch{await release();throw new Error("Controller ledger cannot be recovered safely.");}
  return {
    read(){if(closed)throw new Error("Controller store is closed.");return structuredClone(state);},
    write(value){if(closed)return Promise.reject(new Error("Controller store is closed."));const next=decodeLedger(structuredClone(value));if(Buffer.byteLength(JSON.stringify(next))>32*1024*1024)throw new Error("Controller evidence ledger is full; preserve it before continuing.");const write=tail.then(async()=>{const temp=join(root,`.ledger-${randomUUID()}.tmp`);const f=await open(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await f.writeFile(JSON.stringify(next));await f.sync();}finally{await f.close();}await rename(temp,join(root,"ledger.json"));await syncDirectory(root);state=next;});tail=write;return write;},
    async close(){if(closed)return;closed=true;await tail.catch(()=>{});await release();},
  };
}
