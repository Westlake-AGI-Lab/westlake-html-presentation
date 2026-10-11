"""One Python entry point for serving, testing, experiments and dataset validation."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

from .config import PROJECT_ROOT


def main(argv=None):
    parser=argparse.ArgumentParser(prog='westlake-ppt')
    commands=parser.add_subparsers(dest='command',required=True)
    serve=commands.add_parser('serve',help='Serve a local or explicitly configured LAN deck')
    serve.add_argument('--web-root',type=Path);serve.add_argument('--deck')
    serve.add_argument('--host');serve.add_argument('--port',type=int)
    demo=commands.add_parser('demo',help='Run an isolated demonstration')
    demo.add_argument('topic',choices=['eigen','determinants']);demo.add_argument('--output',type=Path,required=True)
    demo.add_argument('--port',type=int,default=8782);demo.add_argument('--mock',action='store_true')
    test=commands.add_parser('test',help='Run Python and JavaScript checks from one command')
    test.add_argument('--suite',choices=['unit','python','browser','all'],default='unit')
    evaluate=commands.add_parser('eval',help='Run a named, local experiment; no implicit model calls')
    evaluate.add_argument('experiment');evaluate.add_argument('--config',type=Path);evaluate.add_argument('--smoke',action='store_true')
    dataset=commands.add_parser('dataset',help='Validate or build a consent-gated JSONL dataset')
    dataset.add_argument('operation',choices=['validate','build']);dataset.add_argument('--input',type=Path,required=True)
    dataset.add_argument('--output',type=Path)
    commands.add_parser('prompts',help='Print exact prompt hashes')
    args=parser.parse_args(argv)
    try:
        if args.command=='serve':
            for key,value in [('PPT_WEB_ROOT',args.web_root),('PPT_DECK',args.deck),('HOST',args.host),('PORT',args.port)]:
                if value is not None:os.environ[key]=str(value)
            from .server.app import main as serve_main
            serve_main();return 0
        if args.command=='demo':
            name='eigen' if args.topic=='eigen' else 'learning'
            command=[sys.executable,'-m','westlake_ppt.demos.'+name,'--output',str(args.output),'--port',str(args.port)]
            if args.mock and name=='learning':command.append('--mock')
            return subprocess.call(command,env=child_environment())
        if args.command=='test':
            from .testing import run_tests
            return run_tests(args.suite)
        if args.command=='eval':
            from .research import run_experiment
            print(run_experiment(args.experiment,args.config,args.smoke));return 0
        if args.command=='dataset':
            from .research import load_dataset, write_dataset
            records=load_dataset(args.input)
            if args.operation=='build':
                if not args.output:parser.error('dataset build requires --output')
                write_dataset(records,args.output)
            print(json.dumps({'valid':True,'records':len(records),'operation':args.operation}));return 0
        from .prompts import prompt_manifest
        print(json.dumps(prompt_manifest(),indent=2));return 0
    except (ValueError,OSError) as exc:
        parser.exit(2,str(exc)+'\n')


def child_environment():
    env=os.environ.copy()
    env['PYTHONPATH']=str(PROJECT_ROOT/'src')+os.pathsep+env.get('PYTHONPATH','')
    return env
