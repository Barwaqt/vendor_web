import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('vendor returns requests reach backend; unsupported routes stay blocked',async()=>{
 const source=readFileSync(new URL('../app/api/commerce/[...path]/route.ts',import.meta.url),'utf8');
 const exports={},calls=[];
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports,process:{env:{}},URL,AbortSignal,setTimeout,require(name){
 if(name==='next/server')return {NextResponse:{json:(body,options)=>({body,...options})}};
 if(name==='next/headers')return {cookies:async()=>({get:()=>({value:'test-access-token'})})};
 if (name === '../../../lib/session-refresh') return { refreshSession() { throw Error('Unexpected session refresh in this test'); } };
        throw Error(name);
 },fetch:async(url)=>{calls.push(url);return {status:200,text:async()=>JSON.stringify({data:{items:[],total:0}})}}});
 const req={method:'GET',headers:new Headers(),url:'http://localhost:3001/api/commerce/returns',nextUrl:{search:'?page=1'}};
 const response=await exports.GET(req,{params:Promise.resolve({path:['returns']})});
 assert.equal(response.status,200);assert.equal(calls[0],'http://localhost:4000/api/v1/returns?page=1');
 const blocked=await exports.GET(req,{params:Promise.resolve({path:['admin','vendors']})});assert.equal(blocked.status,404);assert.equal(calls.length,1);
});
