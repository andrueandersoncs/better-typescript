import { mkdir, rename } from "node:fs/promises";
import { applyAction, createScenarioSession, getSnapshot, listScenarios, type ScenarioSession } from "./simulation.ts";

const port = Number(process.env.PORT ?? 4317);
const hostname = process.env.HOST ?? "127.0.0.1";
const htmlPath = new URL("./interactive-plan.html", import.meta.url);
const reviewPath = new URL("./review-feedback.json", import.meta.url);
const canonicalPath = new URL("./canonical-scenarios-revision-5-candidate.json", import.meta.url);
const sessions = new Map<string, ScenarioSession>();
const json = (value: unknown, status = 200, headers: HeadersInit = {}) => Response.json(value, { status, headers: { "cache-control": "no-store", ...headers } });

type Disposition = "accept" | "change" | "question";
type ReviewItem = { readonly itemId:string; readonly title:string; readonly category:string; readonly disposition:Disposition; readonly comment:string; readonly replacement:string; readonly updatedAt:string };
type ReviewState = {
  readonly schemaVersion:"task-unification-review-feedback/v5"; readonly planId:"task-unification"; readonly revision:5; readonly updatedAt:string;
  readonly items:Record<string,ReviewItem>; readonly itemAudit:Record<string,ReadonlyArray<Record<string,unknown>>>; readonly revisionResponses:Record<string,Record<string,unknown>>;
  readonly reviewIntent:null|{readonly recordedAt:string;readonly note:string}; readonly reviewIntentAudit:ReadonlyArray<Record<string,unknown>>; readonly revisionAudit:ReadonlyArray<Record<string,unknown>>;
};
const blankReview = (): ReviewState => ({schemaVersion:"task-unification-review-feedback/v5",planId:"task-unification",revision:5,updatedAt:new Date(0).toISOString(),items:{},itemAudit:{},revisionResponses:{},reviewIntent:null,reviewIntentAudit:[],revisionAudit:[]});
async function readReview():Promise<ReviewState>{
  const file=Bun.file(reviewPath); if(!(await file.exists())) return blankReview(); const value=await file.json();
  return {...blankReview(),...value,schemaVersion:"task-unification-review-feedback/v5",revision:5,items:value.items??{},itemAudit:value.itemAudit??{},revisionResponses:value.revisionResponses??{},reviewIntentAudit:value.reviewIntentAudit??[],revisionAudit:value.revisionAudit??[]};
}
async function persistReview(value:ReviewState){await mkdir(new URL("./",reviewPath),{recursive:true});const temporary=new URL("./review-feedback.json.tmp",import.meta.url);await Bun.write(temporary,JSON.stringify(value,null,2)+"\n");await rename(temporary,reviewPath)}
function text(value:unknown,name:string,max:number){if(typeof value!=="string")throw new Error(`${name} must be a string`);if(value.length>max)throw new Error(`${name} must be at most ${max} characters`);return value}
function disposition(value:unknown):Disposition{if(value==="accept"||value==="change"||value==="question")return value;throw new Error("disposition must be accept, change, or question")}
const invalidateIntent=(state:ReviewState,now:string,reason:string):ReviewState=>state.reviewIntent?{...state,reviewIntent:null,reviewIntentAudit:[...state.reviewIntentAudit,{event:"review-intent-invalidated",invalidatedAt:now,recordedAt:state.reviewIntent.recordedAt,reason}]}:state;
if(!(await Bun.file(reviewPath).exists()))await persistReview(blankReview());

const scenarioId = async (value: unknown) => {
  if (typeof value !== "string") throw new Error("scenario must be a string");
  if (!(await listScenarios()).some((scenario) => scenario.id === value)) throw new Error(`Unknown canonical scenario: ${value}`);
  return value;
};
const reset = async (id: string) => {
  const prior = sessions.get(id); if (prior) await prior.close();
  const session = await createScenarioSession(id); sessions.set(id, session); return getSnapshot(session);
};

Bun.serve({hostname,port,async fetch(request){const url=new URL(request.url);try{
  if(request.method==="GET"&&url.pathname==="/")return new Response(await Bun.file(htmlPath).text(),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
  if(request.method==="GET"&&url.pathname==="/canonical-scenarios-revision-5-candidate.json")return new Response(await Bun.file(canonicalPath).text(),{headers:{"content-type":"application/json","cache-control":"no-store"}});
  if(request.method==="GET"&&url.pathname==="/api/health")return json({ok:true,runtime:"Effect 4 + @effect/sql-sqlite-bun",database:"fresh SQLite file and Effect layer per scenario",feedback:"durable versioned plan-scoped JSON",revision:5});
  if(request.method==="GET"&&url.pathname==="/api/scenarios")return json(await listScenarios());
  if(request.method==="POST"&&url.pathname==="/api/reset"){const body=await request.json() as {scenario?:unknown};return json(await reset(await scenarioId(body.scenario)))}
  if(request.method==="POST"&&url.pathname==="/api/action"){const body=await request.json() as {scenario?:unknown;action?:unknown};const id=await scenarioId(body.scenario);if(typeof body.action!=="string")return json({error:"action must be a string"},400);const session=sessions.get(id);if(!session)throw new Error("Reset the scenario before applying an action");return json(await applyAction(session,body.action))}
  if(request.method==="GET"&&url.pathname==="/api/snapshot"){const id=await scenarioId(url.searchParams.get("scenario"));const session=sessions.get(id);if(!session)throw new Error("Reset the scenario before reading a snapshot");return json(await getSnapshot(session))}
  if(request.method==="GET"&&url.pathname==="/api/review")return json(await readReview());
  if(request.method==="GET"&&url.pathname==="/api/review/export")return json(await readReview(),200,{"content-disposition":'attachment; filename="task-unification-review-feedback-v5.json"'});
  if(request.method==="POST"&&url.pathname==="/api/review/item"){
    const body=await request.json() as Record<string,unknown>;const now=new Date().toISOString();let state=invalidateIntent(await readReview(),now,"Feedback changed after revision 5 review intent was recorded.");
    const item:ReviewItem={itemId:text(body.itemId,"itemId",120),title:text(body.title,"title",200),category:text(body.category,"category",80),disposition:disposition(body.disposition),comment:text(body.comment,"comment",10_000),replacement:text(body.replacement,"replacement",20_000),updatedAt:now};
    const prior=state.items[item.itemId];const audit=[...(state.itemAudit[item.itemId]??[]),...(prior?[{event:"prior-current-response",cycle:5,record:prior}]:[]),{event:"review-feedback-saved",cycle:5,record:item}];
    const next:ReviewState={...state,updatedAt:now,items:{...state.items,[item.itemId]:item},itemAudit:{...state.itemAudit,[item.itemId]:audit}};await persistReview(next);return json(next);
  }
  if(request.method==="POST"&&url.pathname==="/api/review/intent"){
    const state=await readReview();const now=new Date().toISOString();const intent={recordedAt:now,note:"Reviewer clicked Approve contract for revision 5. This is review intent only; conversation confirmation is still required."};
    const next:ReviewState={...state,updatedAt:now,reviewIntent:intent,reviewIntentAudit:[...state.reviewIntentAudit,{event:"review-intent-recorded",...intent,revision:5}]};await persistReview(next);return json(next);
  }
  if(request.method==="POST"&&url.pathname==="/api/review/clear"){
    const state=await readReview();const now=new Date().toISOString();const withIntent=invalidateIntent(state,now,"Current revision 5 responses were reset.");
    const next:ReviewState={...withIntent,updatedAt:now,items:{},revisionAudit:[...withIntent.revisionAudit,{revision:5,at:now,event:"current-responses-reset",note:"Historical human feedback, approvals, and dispositions remain in audits."}]};await persistReview(next);return json(next);
  }
  return json({error:"Not found"},404);
}catch(error){console.error(error);return json({error:error instanceof Error?error.message:String(error)},400)}}});
console.log(`Task unification executable plan revision 5: http://${hostname}:${port}/`);
console.log(`Canonical runtime source: ${canonicalPath.pathname}`);
console.log("Each scenario reset creates a fresh isolated SQLite database and Effect layer.");
