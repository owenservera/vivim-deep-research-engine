import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MissingVerificationCriterionError, PrematurePhaseTransitionError, ResearchEngine, TokenPressureTracker } from "./engine";
import { computeFleetComposition, runFleet } from "./fleet";
const config = { framework_version:"2.1.0", target_repo_path:"project/", session_id:"test", survivability:{danger_zone_tokens:100,checkpoint_margin_ratio:.8,max_actions_between_checkpoints:3}, agent_roles:{generator:{count_ratio:.2,master_path:"g"},extender:{count_ratio:.2,master_path:"e"},validator:{count_ratio:.2,master_path:"v"},literature:{count_ratio:.15,master_path:"l"},synthesizer:{count_ratio:.05,master_path:"s"},blindspot:{count_ratio:.05,master_path:"b"}}, hazard_seed_ids:[] } as const;
let root:string; beforeEach(()=>{ root=mkdtempSync(join(tmpdir(),"vivim-research-")); }); afterEach(()=>rmSync(root,{recursive:true,force:true}));
const input=(phase:any="generation")=>({phase,agentRole:"generator" as const,question:"q",approach:"new approach",verificationCriterion:"must pass",filePath:"session/02-candidates/c.md",evidenceLinks:[]});
describe("survivability",()=>{
 test("requests checkpoint by token margin and resets after checkpoint",()=>{ const t=new TokenPressureTracker(100,.8,99); expect(t.record(79).checkpointRequired).toBe(false); expect(t.record(1).checkpointRequired).toBe(true); t.reset(); expect(t.status().checkpointRequired).toBe(false); });
 test("requests checkpoint by action floor",()=>{ const t=new TokenPressureTracker(100,.8,2); t.record(1); expect(t.record(1).checkpointRequired).toBe(true); });
 test("fresh engine resumes state and exact brief from checkpoint",()=>{ const e=new ResearchEngine(root,config); e.advancePhase(); const c=e.proposeCandidate(input()); e.writeCheckpoint("Continue validation; do not redo candidate generation."); const fresh=new ResearchEngine(root,config); expect(fresh.getState().phase).toBe("generation"); expect(Object.keys(fresh.getState().candidates)).toContain(c.id); expect(fresh.getResumeBrief()).toContain("do not redo"); });
});
describe("invariants",()=>{
 test("rejects empty verification criterion",()=>{ const e=new ResearchEngine(root,config); expect(()=>e.proposeCandidate({...input(),verificationCriterion:""})).toThrow(MissingVerificationCriterionError); });
 test("cannot verify without passing repro",()=>{ const e=new ResearchEngine(root,config); const c=e.proposeCandidate(input()); expect(()=>e.promoteToVerified(c.id)).toThrow(PrematurePhaseTransitionError); });
 test("verified requires passing repro and then phase progression",()=>{ const e=new ResearchEngine(root,config); e.advancePhase(); const c=e.proposeCandidate(input()); e.advancePhase(); e.recordRepro({candidateId:c.id,method:"counterexample",passed:true,filePath:"session/03-repros/r.md",log:"pass"}); e.advancePhase(); e.promoteToVerified(c.id); expect(e.advancePhase()).toBe("output"); });
 test("deadend collision is rejected",()=>{ const e=new ResearchEngine(root,config); e.logDeadend("use brute force"); expect(()=>e.proposeCandidate({...input(),approach:"Use brute force for this"})).toThrow(PrematurePhaseTransitionError); });
 test("evidence hashes detect modification",()=>{ mkdirSync(join(root,"session/03-repros"),{recursive:true}); writeFileSync(join(root,"session/03-repros","r.md"),"one"); const e=new ResearchEngine(root,config); e.advancePhase(); const c=e.proposeCandidate(input()); e.captureEvidence(c.id,"session/03-repros/r.md"); expect(e.verifyEvidenceIntegrity().ok).toBe(true); writeFileSync(join(root,"session/03-repros","r.md"),"two"); expect(e.verifyEvidenceIntegrity().ok).toBe(false); });
 test("objective completion requires verified candidate",()=>{ const e=new ResearchEngine(root,config); expect(()=>e.declareObjectiveComplete("done")).toThrow(); });
});
describe("fleet",()=>{
 test("largest remainder always allocates exactly the requested seats",()=>{ for(let n=1;n<=1000;n++){ const c=computeFleetComposition(config,n); expect(c.reduce((s,x)=>s+x.count,0)).toBe(n); expect(c.every(x=>x.count>=0)).toBe(true); } });
 test("fleet stops pulling new work after pressure signal and checkpoints",async()=>{ const e=new ResearchEngine(root,config); const result=await runFleet(e,config,async task=>({role:task.role,raw:"ok",estimatedTokens:40}),{totalAgents:10,concurrency:2,phase:"generation",checkpointBrief:"Resume from the latest completed fleet results."},()=>"prompt"); expect(result.checkpointRequired).toBe(true); expect(result.remainingTasks).toBeGreaterThan(0); expect(e.getResumeBrief()).toContain("latest completed"); });
});
