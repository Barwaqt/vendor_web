import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../app/api/auth/[action]/route.ts',import.meta.url),'utf8');
function harness(data){
 const calls=[],cookies=[],exports={};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,process:{env:{}},URL,AbortSignal,require(name){
  if(name==='../../../lib/session-refresh')return {refreshSession:async()=>null};
  if(name==='next/server')return {NextResponse:{json:(body,options)=>({body,...options})}};
  if(name==='next/headers')return {cookies:async()=>({get:()=>undefined,set:(...args)=>cookies.push(args),delete:()=>{}})};
  throw Error(name);
 },fetch:async(url,options)=>{calls.push({url,...options});return {ok:true,status:200,text:async()=>JSON.stringify({data})};}});
 return {calls,cookies,post:(action,body)=>exports.POST({method:'POST',url:'http://localhost:3001/api/auth/'+action,headers:new Headers({origin:'http://localhost:3001'}),json:async()=>body},{params:Promise.resolve({action})})};
}
test('public phone signup remains unavailable on the vendor portal',async()=>{
 const h=harness({});assert.equal((await h.post('phone-signup',{})).status,404);assert.equal(h.calls.length,0);
});
test('phone login pins vendor portal and does not save a session before verification',async()=>{
 const h=harness({challengeId:'challenge'});assert.equal((await h.post('phone-login',{phone:'+923001234567',portal:'customer'})).status,200);
 assert.equal(JSON.parse(h.calls[0].body).portal,'vendor');assert.equal(h.cookies.length,0);
});
test('phone verification sets vendor session cookies and rejects customer accounts',async()=>{
 for(const role of ['VENDOR','CUSTOMER']){
  const h=harness({user:{id:'user',role},accessToken:'access',refreshToken:'refresh',expiresIn:900});
  const result=await h.post('phone-verify',{challengeId:'challenge',code:'123456'});
  assert.equal(result.status,role==='VENDOR'?200:403);assert.equal(h.cookies.length,role==='VENDOR'?2:0);
  assert.ok(h.cookies.every(c=>c[2].httpOnly));assert.equal(result.body.data?.accessToken,undefined);
 }
});
