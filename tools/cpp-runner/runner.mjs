// Runno executes Clang and the student binary in WASI virtual filesystems, never as native code.
import {runCode} from '@runno/sandbox';
let compilerDiagnostics='';
console.error=(e)=>{if(e?.data?.stderr)compilerDiagnostics=String(e.data.stderr).slice(0,12000);};
let raw='';for await(const c of process.stdin){raw+=c;if(raw.length>40000)process.exit(2);}
try{
 const {code,stdin=''}=JSON.parse(raw);
 const result=await runCode('clangpp',code,{stdin,timeout:3});
 const clean=s=>String(s||'').replace(/\u001b\[[0-9;]*m/g,'').slice(0,12000);
 let response;
 if(result.resultType==='complete')response={kind:result.exitCode===0?'complete':'error',stdout:clean(result.stdout),stderr:clean(result.stderr),exitCode:result.exitCode};
 else if(result.resultType==='timeout')response={kind:'timeout',stdout:'',stderr:'Execution exceeded 3 seconds.'};
 else response={kind:'error',stdout:'',stderr:clean(compilerDiagnostics||result.error?.message||result.message||'Compilation failed or the program stopped unexpectedly.')};
 process.stdout.write(JSON.stringify(response));
}catch{process.stdout.write(JSON.stringify({kind:'error',stdout:'',stderr:'The isolated compiler is unavailable.'}));}
process.exit(0);
