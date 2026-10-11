import { randomUUID, createHash } from "node:crypto";
import { isAbsolute } from "node:path";
import { agentConfig, sourceReceipt, runDiagnostic, runResult, resultDigestInput, object, terminal, text,
  type AgentConfig, type SourceReceipt, type CodingRun, type RunnerEvent, type CleanupStatus } from "../../../packages/coding-contract/src/index";
import { decodeCodingRun, type ControllerStore, type ControllerEntry, type ControllerLedger, type TaskOutcome } from "./local-coding-store";

export interface TaskRunInput {runId:string;generation:number;task:CodingRun["taskSnapshot"];agent:AgentConfig;source:SourceReceipt;snapshotDirectory:string}
export interface ControllerOptions {
  client:{request(path:string,body?:unknown,signal?:AbortSignal):Promise<unknown>};
  store:ControllerStore;agent:AgentConfig;source:SourceReceipt;snapshotDirectory:string;liveEnabled:boolean;
  runtime:{runTask(input:TaskRunInput,options:{signal:AbortSignal;onProgress:(progress:string)=>Promise<void>}):Promise<TaskOutcome>;recoverTask(input:TaskRunInput):Promise<{cleanup:CleanupStatus;error:string}>};
  /** Trusted retained source lookup. Paths never come from API/task text. */
  resolveSnapshot?:(source:SourceReceipt)=>string|Promise<string>;
  /** Fixed public readiness explanation, not raw prerequisite/native diagnostics. */
  unavailableReason?:string;
  onNotice?:(message:string)=>void;
}
const stages:Record<string,string>={"Running an isolated workspace tool.":"Running a sandbox tool.","Codex is working on the saved task in an isolated checkout.":"Running the configured coding model.",preparing:"Preparing isolated task workspace.","task-started":"Preparing isolated task workspace.","model-request":"Running the configured coding model.","model-started":"Running the configured coding model.","tool-call":"Running a sandbox tool.","tool-started":"Running a sandbox tool.",checking:"Checking isolated changes.",collecting:"Collecting bounded result evidence.",cleanup:"Cleaning owned task resources."};
const stopped = () => new Error("Local coding execution stopped safely.");
const cancellationWon=(run:CodingRun)=>run.status==="cancelling"||run.cancellation?.outcome==="applied";
const providerMax=(a:CodingRun["providerOutcome"],b:CodingRun["providerOutcome"]):CodingRun["providerOutcome"]=>a==="completed"||b==="completed"?"completed":a==="unknown"||b==="unknown"?"unknown":"not-started";
/** All state/API transitions use one queue. The native attempt itself is owned outside
 * that queue so heartbeat/cancel can run while it waits. No fire-and-forget tools. */
export class LocalCodingController {
  private readonly options:ControllerOptions;
  private ledger:ControllerLedger;
  private queue:Promise<unknown>=Promise.resolve();
  private active:{id:string;abort:AbortController;done:Promise<void>;apiFailed:boolean}|null=null;
  private stopping=false;
  private initialized=false;
  private inspectedRecovery=false;
  private recovery=new Set<string>();
  private stopPromise:Promise<void>|null=null;
  constructor(options:ControllerOptions){
    this.options={...options,agent:agentConfig(options.agent),source:sourceReceipt(options.source),unavailableReason:options.unavailableReason===undefined?undefined:text(options.unavailableReason,1000,true)};
    if(options.agent.model!=="gpt-5.5"||!isAbsolute(options.snapshotDirectory))throw new Error("Invalid local coding configuration.");
    this.ledger=options.store.read();
  }
  private serial<T>(f:()=>Promise<T>):Promise<T>{const result=this.queue.then(f);this.queue=result.catch(()=>{});return result;}
  private save(){return this.options.store.write(this.ledger);}
  private notice(){try{this.options.onNotice?.("Local coding control needs reconciliation; execution is stopped and evidence is retained.");}catch{/* notices have no authority */}}
  private input(entry:ControllerEntry):TaskRunInput{return {runId:entry.run.id,generation:entry.run.generation,task:structuredClone(entry.run.taskSnapshot),agent:structuredClone(entry.run.agent),source:structuredClone(entry.run.source),snapshotDirectory:entry.snapshotDirectory};}
  private async readRun(entry:ControllerEntry,signal?:AbortSignal){
    const latest=decodeCodingRun(await this.options.client.request(`/api/local-runner/runs/${encodeURIComponent(entry.run.id)}`,undefined,signal));
    const old=entry.run;
    if(latest.id!==old.id||latest.generation!==old.generation||latest.version<old.version||latest.runtimeVersion<old.runtimeVersion||(terminal(old.status)&&latest.status!==old.status)||(old.cleanup==="complete"&&latest.cleanup!=="complete")||latest.taskId!==old.taskId||latest.taskRevision!==old.taskRevision||JSON.stringify(latest.taskSnapshot)!==JSON.stringify(old.taskSnapshot)||JSON.stringify(latest.agent)!==JSON.stringify(old.agent)||JSON.stringify(latest.source)!==JSON.stringify(old.source))throw stopped();
    entry.run=latest;await this.save();return latest;
  }
  /** Retry an uncertain event byte-for-byte before considering a new CAS intent.
   * Only a subsequent authoritative GET permits rebase. No external action repeats. */
  private async flush(entry:ControllerEntry,signal?:AbortSignal):Promise<void>{
    const event=entry.pending;if(!event)return;
    try{
      const ack=decodeCodingRun(await this.options.client.request("/api/local-runner/events",event,signal));
      if(ack.id!==event.runId||ack.generation!==event.generation||ack.runtimeVersion<event.expectedVersion+1||ack.taskId!==entry.run.taskId||ack.taskRevision!==entry.run.taskRevision||JSON.stringify(ack.taskSnapshot)!==JSON.stringify(entry.run.taskSnapshot)||JSON.stringify(ack.agent)!==JSON.stringify(entry.run.agent)||JSON.stringify(ack.source)!==JSON.stringify(entry.run.source))throw stopped();
      // Runtime dedup replies may include newer authoritative cancellation/events.
      if(ack.runtimeVersion===event.expectedVersion+1&&(ack.status!==event.status||ack.cleanup!==event.cleanup||ack.progress!==event.progress||ack.error!==event.error||ack.providerOutcome!==event.providerOutcome||JSON.stringify(ack.diagnostic)!==JSON.stringify(event.diagnostic)||JSON.stringify(ack.result)!==JSON.stringify(event.result)))throw stopped();
      if(ack.version>=entry.run.version)entry.run=ack;
      entry.pending=null;await this.save();
    }catch(error){
      const latest=await this.readRun(entry,signal);
      // A transport failure is not evidence that this ID was rejected. Retain
      // exact bytes even if GET sees a newer version; next flush retries the ID.
      const conflict=typeof error==="object"&&error!==null&&"code" in error&&error.code==="control-conflict";
      if(conflict&&latest.runtimeVersion>event.expectedVersion){
        entry.pending=null;await this.save(); // proven CAS rejection; rebase later
      }
      throw stopped();
    }
  }
  private async emit(entry:ControllerEntry,fields:Omit<RunnerEvent,"runId"|"generation"|"eventId"|"expectedVersion">,signal?:AbortSignal){
    await this.flush(entry,signal);
    entry.pending={runId:entry.run.id,generation:entry.run.generation,eventId:randomUUID(),expectedVersion:entry.run.runtimeVersion,...fields};
    await this.save();await this.flush(entry,signal);
  }
  private fields(run:CodingRun){return {stopProven:false,status:run.status,cleanup:run.cleanup,progress:run.progress,error:run.error,providerOutcome:run.providerOutcome,diagnostic:run.diagnostic,result:run.result};}
  private async acknowledgeCancel(entry:ControllerEntry,signal?:AbortSignal){
    // Only the SDK inbox evaluates the original cancellation version. Never
    // silently rebase a D1 receipt into a new authoritative cancel command.
    if(entry.run.cancellation?.outcome==="pending")throw stopped();
    if(cancellationWon(entry.run))this.active?.abort.abort();
  }
  private async authorize(entry:ControllerEntry,kind:"work"|"cleanup",signal?:AbortSignal){
    const intent={effectId:randomUUID(),kind,runtimeVersion:entry.run.runtimeVersion,authorized:false};
    entry.effectIntents.push(intent);await this.save();
    const reply=object(await this.options.client.request("/api/local-runner/authorize",{runId:entry.run.id,generation:entry.run.generation,expectedRuntimeVersion:intent.runtimeVersion,effectId:intent.effectId,kind},signal),["runId","generation","kind","authorized","reason","runtimeVersion","effectId"]);
    if(reply.runId!==entry.run.id||reply.generation!==entry.run.generation||reply.kind!==kind||reply.authorized!==true||reply.runtimeVersion!==intent.runtimeVersion||reply.effectId!==intent.effectId||typeof reply.reason!=="string"||reply.reason.length>1000)throw stopped();
    intent.authorized=true;await this.save();
  }
  private async inspectRecovery(signal?:AbortSignal){
    const inventory=object(await this.options.client.request("/api/local-runner/recovery",undefined,signal),["runs"]);
    if(!Array.isArray(inventory.runs)||inventory.runs.length>1)throw stopped();
    for(const raw of inventory.runs){
      const recoveredRun=decodeCodingRun(raw);
      const known=this.ledger.entries.find(e=>e.run.id===recoveredRun.id);
      if(known){if(known.run.generation!==recoveredRun.generation||known.phase==="closed")throw stopped();continue;}
      if(this.ledger.entries.some(e=>e.phase!=="closed"))throw stopped();
      const snapshotDirectory=this.options.resolveSnapshot?await this.options.resolveSnapshot(recoveredRun.source):JSON.stringify(recoveredRun.source)===JSON.stringify(this.options.source)?this.options.snapshotDirectory:null;
      if(!snapshotDirectory||!isAbsolute(snapshotDirectory))throw stopped();
      const recovered:ControllerEntry={run:recoveredRun,snapshotDirectory,phase:recoveredRun.status==="queued"?"claimed":"started",pending:null,outcome:null,cleanupDisposition:null,effectIntents:[]};
      this.ledger.entries.push(recovered);await this.save();this.recovery.add(recoveredRun.id);
    }
    this.inspectedRecovery=true;this.ledger.claimPending=false;await this.save();
  }
  async tick(signal?:AbortSignal):Promise<void>{
    if(this.stopping)return;
    return this.serial(async()=>{
      if(this.stopping)return;
      try{
        signal?.throwIfAborted();
        if(!this.initialized){for(const e of this.ledger.entries)if(e.phase!=="closed")this.recovery.add(e.run.id);this.initialized=true;}
        const owned=this.ledger.entries.find(e=>e.phase!=="closed");
        if(owned&&!this.active&&(this.recovery.has(owned.run.id)||!owned.outcome))await this.recover(owned);
        const registration=object(await this.options.client.request("/api/local-runner/register",{agent:this.options.agent,source:this.options.source,ready:this.options.liveEnabled,reason:this.options.liveEnabled?"":this.options.unavailableReason??"Live coding execution is not enabled by the local operator."},signal),["registered"]);
        if(registration.registered!==true)throw stopped();
        if(!this.active&&(!this.inspectedRecovery||this.ledger.claimPending))await this.inspectRecovery(signal);
        const entry=this.ledger.entries.find(e=>e.phase!=="closed");
        if(entry){
          // Owned resource cleanup never waits for a working API.
          if(!this.active&&(this.recovery.has(entry.run.id)||!entry.outcome))await this.recover(entry);
          await this.flush(entry,signal);await this.readRun(entry,signal);await this.acknowledgeCancel(entry,signal);
          if(this.active){if(terminal(entry.run.status))this.active.abort.abort();return;}
          await this.project(entry,signal);return;
        }
        if(this.active)return;
        if(!this.options.liveEnabled&&!this.ledger.claimPending)return;
        this.ledger.claimPending=true;await this.save();
        const claim=object(await this.options.client.request("/api/local-runner/claim",{},signal),["run"]);
        if(claim.run===null){this.ledger.claimPending=false;await this.save();return;}
        const run=decodeCodingRun(claim.run);
        const previous=this.ledger.entries.find(e=>e.run.id===run.id);
        if(previous)throw stopped(); // Never execute a locally known attempt twice.
        const e:ControllerEntry={run,snapshotDirectory:this.options.snapshotDirectory,phase:"claimed",pending:null,outcome:null,cleanupDisposition:null,effectIntents:[]};
        this.ledger.entries.push(e);this.ledger.claimPending=false;await this.save();
        await this.readRun(e,signal);await this.acknowledgeCancel(e,signal);
        if(!this.options.liveEnabled||run.status!=="queued"||JSON.stringify(run.agent)!==JSON.stringify(this.options.agent)||JSON.stringify(run.source)!==JSON.stringify(this.options.source)){
          this.recovery.add(e.run.id);await this.recover(e);await this.project(e,signal);return;
        }
        if(cancellationWon(e.run)){e.phase="finished";e.outcome={status:"cancelled",cleanup:"complete",error:"",providerOutcome:"not-started",diagnostic:null,result:null};await this.save();await this.project(e,signal);return;}
        await this.emit(e,{...this.fields(e.run),status:"running",cleanup:"pending",progress:"Preparing isolated task workspace."},signal);
        // Re-read the cancellation/version fence immediately before persisting start.
        await this.readRun(e,signal);await this.acknowledgeCancel(e,signal);
        if(cancellationWon(e.run)){e.phase="finished";e.outcome={status:"cancelled",cleanup:"complete",error:"",providerOutcome:"not-started",diagnostic:null,result:null};await this.save();await this.project(e,signal);return;}
        signal?.throwIfAborted();
        if(this.stopping||e.run.status!=="running")throw stopped();
        await this.authorize(e,"cleanup",signal);
        await this.authorize(e,"work",signal);
        e.phase="started";await this.save();
        if(this.stopping||signal?.aborted)throw stopped();
        this.start(e);
      }catch{if(this.active){this.active.apiFailed=true;this.active.abort.abort();}this.notice();}
    });
  }
  private start(entry:ControllerEntry){
    const abort=new AbortController();
    const active={id:entry.run.id,abort,done:Promise.resolve(),apiFailed:false};this.active=active;
    const timer=setTimeout(()=>abort.abort(),entry.run.agent.limits.maxDurationMs);
    active.done=(async()=>{
      let outcome:TaskOutcome;
      try{
        const raw=await this.options.runtime.runTask(this.input(entry),{signal:abort.signal,onProgress:async(stage)=>{
          try{await this.serial(async()=>{if(abort.signal.aborted||this.stopping)throw stopped();await this.flush(entry);await this.readRun(entry);await this.acknowledgeCancel(entry);if(abort.signal.aborted||entry.run.status!=="running")throw stopped();await this.emit(entry,{...this.fields(entry.run),progress:stages[stage]??"Executing the isolated coding task.",providerOutcome:providerMax(entry.run.providerOutcome,stage==="model-request"||stage==="model-started"||stage==="Codex is working on the saved task in an isolated checkout."?"unknown":entry.run.providerOutcome)});await this.authorize(entry,"work");});}
          catch{active.apiFailed=true;abort.abort();throw stopped();}
        }});
        outcome=this.decodeOutcome(raw);
      }catch{outcome={status:"interrupted",cleanup:"blocked",error:"Task execution did not produce validated completion evidence.",providerOutcome:"unknown",diagnostic:runDiagnostic({runtimeStage:"native",code:"runtime-failed",nativeStage:null,nativeEventStage:null,nativeReason:null,gatewayPhase:null,gatewayReason:null,gatewayFailed:null,modelRequests:null,toolCalls:null}),result:null};}
      clearTimeout(timer);
      await this.serial(async()=>{
        if(abort.signal.aborted||active.apiFailed){outcome={...outcome,status:cancellationWon(entry.run)?"cancelled":"interrupted",error:cancellationWon(entry.run)?"":"Task execution stopped before completion was confirmed.",result:null};}
        entry.outcome=outcome;entry.phase="finished";
        this.recovery.add(entry.run.id);
        try{await this.save();}catch{await this.recover(entry);throw stopped();}
        try{await this.recover(entry);await this.flush(entry);await this.readRun(entry);await this.acknowledgeCancel(entry);await this.project(entry);}catch{this.notice();}
      });
    })().catch(()=>{this.notice();}).finally(()=>{clearTimeout(timer);if(this.active===active)this.active=null;});
  }
  private decodeOutcome(raw:unknown):TaskOutcome{
    const v=object(raw,["status","cleanup","error","providerOutcome","diagnostic","result"]);
    if(!["succeeded","failed","cancelled","interrupted"].includes(v.status as string)||!["pending","blocked","complete"].includes(v.cleanup as string)||!["not-started","unknown","completed"].includes(v.providerOutcome as string))throw stopped();
    const result=v.result===null?null:runResult(v.result);
    const diagnostic=v.diagnostic===null?null:runDiagnostic(v.diagnostic);
    if(typeof v.error!=="string"||Buffer.byteLength(JSON.stringify(result))>230_000)throw stopped();
    if(result&&/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})|\bBearer\s+[A-Za-z0-9_.-]{20,}/.test(JSON.stringify(result)))throw stopped();
    if(result&&createHash("sha256").update(resultDigestInput(result)).digest("hex")!==result.digest.replace(/^sha256:/,""))throw stopped();
    if(v.status==="succeeded"&&(!result||v.providerOutcome!=="completed"||diagnostic!==null)||v.status!=="succeeded"&&result!==null||["failed","interrupted"].includes(v.status as string)&&diagnostic===null)throw stopped();
    return {status:v.status as TaskOutcome["status"],cleanup:v.cleanup as CleanupStatus,error:v.error?"Task execution could not complete safely.":"",providerOutcome:v.providerOutcome as TaskOutcome["providerOutcome"],diagnostic,result};
  }
  private async recover(entry:ControllerEntry){
    let cleanup:CleanupStatus="blocked";
    try{
      // Teardown grants are persisted before work and remain valid offline for
      // only these immutable run/generation resources. They never authorize work.
      if(!entry.effectIntents.some(i=>i.kind==="cleanup"&&i.authorized))await this.authorize(entry,"cleanup");
      const result=await this.options.runtime.recoverTask(this.input(entry));if(result.cleanup==="complete")cleanup="complete";
    }catch{/* Recovery diagnostics are reduced to the closed public contract below. */}
    if(!entry.outcome){entry.outcome={status:cancellationWon(entry.run)&&cleanup==="complete"?"cancelled":"interrupted",cleanup,error:cancellationWon(entry.run)?"":"The local controller restarted; this attempt was not reexecuted.",providerOutcome:entry.phase==="started"?providerMax(entry.run.providerOutcome,"unknown"):entry.run.providerOutcome,diagnostic:cancellationWon(entry.run)?null:runDiagnostic({runtimeStage:"recovery",code:cleanup==="complete"?"runtime-failed":"cleanup-blocked",nativeStage:null,nativeEventStage:null,nativeReason:null,gatewayPhase:null,gatewayReason:null,gatewayFailed:null,modelRequests:null,toolCalls:null}),result:null};}
    else entry.outcome.cleanup=cleanup;
    entry.phase="finished";await this.save();this.recovery.delete(entry.run.id);
  }
  private async project(entry:ControllerEntry,signal?:AbortSignal){
    if(!entry.outcome)return;
    await this.flush(entry,signal);await this.readRun(entry,signal);await this.acknowledgeCancel(entry,signal);
    const outcome=entry.outcome;
    if(!terminal(entry.run.status)){
      const cancellationRequested=cancellationWon(entry.run)||entry.run.status==="cancelling";
      // The coarse adapter contract proves stop only with complete owned cleanup.
      // A receipt plus failed inspection is NOT evidence of termination.
      const cancelled=cancellationRequested&&outcome.cleanup==="complete";
      const stopUnknown=cancellationRequested&&!cancelled;
      const providerOutcome=providerMax(entry.run.providerOutcome,outcome.providerOutcome);
      const uncertainty=providerOutcome==="unknown"?"Provider completion and usage remain unknown. Local cleanup does not prove provider termination.":"";
      const error=stopUnknown?"Cancellation was requested, but owned-resource termination is not confirmed. Cleanup remains blocked."+(uncertainty?" "+uncertainty:""):uncertainty||(cancelled?"":outcome.error||(outcome.status!=="succeeded"?"Task execution ended without confirmed completion.":""));
      await this.emit(entry,{
        status:cancelled?"cancelled":stopUnknown||outcome.status==="cancelled"?"interrupted":outcome.status,
        cleanup:stopUnknown||outcome.cleanup==="blocked"?"blocked":"pending",
        progress:cancelled?"Task execution cancelled.":stopUnknown?"Cancellation is not confirmed; owned resources need reconciliation.":outcome.status==="succeeded"?"Result submitted for operator review.":outcome.cleanup!=="complete"?"Task execution is interrupted; owned-resource termination is not confirmed.":"Task execution stopped.",
        error,providerOutcome,diagnostic:stopUnknown?runDiagnostic({runtimeStage:"recovery",code:"cleanup-blocked",nativeStage:null,nativeEventStage:null,nativeReason:null,gatewayPhase:null,gatewayReason:null,gatewayFailed:null,modelRequests:null,toolCalls:null}):cancellationRequested?null:outcome.diagnostic,result:cancellationRequested?null:outcome.result,stopProven:outcome.cleanup==="complete",
      },signal);
    }
    // Never combine terminal projection and reservation release. Cleanup is a
    // separately durable event, rebased after operator review if required.
    if(entry.run.cleanup!=="complete"){
      const cleanup=outcome.cleanup==="complete"?"complete":"blocked";
      if(cleanup==="complete"&&entry.run.providerOutcome==="unknown"){
        entry.cleanupDisposition="provider-only-uncertainty-after-owned-cleanup";await this.save();
      }
      if(entry.run.cleanup!==cleanup){
        if(cleanup==="complete"&&!entry.effectIntents.some(i=>i.kind==="cleanup"&&i.authorized))await this.authorize(entry,"cleanup",signal);
        await this.emit(entry,{...this.fields(entry.run),cleanup,stopProven:outcome.cleanup==="complete"},signal);
      }
    }
    if(entry.run.cleanup==="complete"){entry.phase="closed";await this.save();}
    else this.recovery.add(entry.run.id);
  }
  async stop():Promise<void>{
    if(this.stopPromise)return this.stopPromise;
    this.stopping=true;this.active?.abort.abort();
    this.stopPromise=(async()=>{
      await this.queue;
      const active=this.active;if(active){active.abort.abort();await active.done;}
      await this.serial(async()=>{
        if(!this.inspectedRecovery||this.ledger.claimPending){try{await this.inspectRecovery();}catch{this.notice();}}
        const entry=this.ledger.entries.find(e=>e.phase!=="closed");
        if(entry){try{await this.recover(entry);await this.flush(entry);await this.readRun(entry);await this.acknowledgeCancel(entry);await this.project(entry);}catch{this.notice();}}
        try{await this.options.client.request("/api/local-runner/register",{agent:this.options.agent,source:this.options.source,ready:false,reason:"The local coding controller is stopped."});}catch{this.notice();}
      });
      await this.options.store.close();
    })();return this.stopPromise;
  }
}
