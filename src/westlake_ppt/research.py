"""Local dataset validation and agreement metrics; never harvests classroom chats."""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import uuid

from .config import PROJECT_ROOT
from .prompts import prompt_manifest

LABELS=('understood','partial','misunderstood')


def validate_record(record):
    if not isinstance(record,dict):raise ValueError('Each dataset row must be an object')
    for name in ('id','concept_id','question','answer'):
        if not isinstance(record.get(name),str) or not record[name].strip():raise ValueError(f'Missing {name}')
    if record.get('language') not in ('en','zh'):raise ValueError('language must be en or zh')
    if record.get('kind') not in ('explain','apply','counterexample','recall'):raise ValueError('Invalid question kind')
    source=record.get('source',{})
    if not isinstance(source,dict) or type(source.get('page')) is not int or source['page']<1:
        raise ValueError('A source page is required')
    for key in ('deck_id','revision','quote'):
        if not isinstance(source.get(key),str) or not source[key].strip():raise ValueError(f'Missing source {key}')
    labels=record.get('labels',{})
    if not isinstance(labels,dict):raise ValueError('Labels must be an object')
    for key in ('annotator_a','annotator_b','adjudicated'):
        if labels.get(key) not in LABELS:raise ValueError(f'Invalid or missing {key} label')
    if labels.get('model') not in (*LABELS,'uncertain',None):raise ValueError('Invalid model label')
    provenance=record.get('provenance',{})
    if not isinstance(provenance,dict) or type(provenance.get('synthetic')) is not bool:
        raise ValueError('Declare whether each record is synthetic')
    if not provenance['synthetic']:
        if provenance.get('consent') is not True or provenance.get('deidentified') is not True:
            raise ValueError('Human data requires documented consent and de-identification')
        if not isinstance(provenance.get('ethics_reference'),str) or not provenance['ethics_reference'].strip():
            raise ValueError('Human data requires an approval or exemption reference')
    return record


def load_dataset(path):
    records=[];seen=set()
    with Path(path).open(encoding='utf-8') as source:
        for number,line in enumerate(source,1):
            if not line.strip():continue
            try:record=validate_record(json.loads(line))
            except (ValueError,TypeError) as exc:raise ValueError(f'Invalid dataset row {number}: {exc}') from None
            if record['id'] in seen:raise ValueError(f'Duplicate dataset ID at row {number}')
            seen.add(record['id']);records.append(record)
    if not records:raise ValueError('Dataset is empty')
    return records


def write_dataset(records,path):
    path=Path(path).resolve();data=(PROJECT_ROOT/'data').resolve()
    if data not in path.parents:raise ValueError('Write dataset builds under the ignored data/ directory')
    path.parent.mkdir(parents=True,exist_ok=True)
    # Refuse overwrite and create private permissions from the first byte.
    descriptor=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(descriptor,'w',encoding='utf-8') as stream:
        for record in records:stream.write(json.dumps(record,ensure_ascii=False)+'\n')


def agreement(left,right):
    if len(left)!=len(right):raise ValueError('Rater lists must have the same length')
    n=len(left)
    if not n:return {'n':0,'agreement':None,'kappa':None}
    a,b=Counter(left),Counter(right)
    observed=sum(x==y for x,y in zip(left,right))/n
    expected=sum(a[label]*b[label] for label in set(a)|set(b))/(n*n)
    return {'n':n,'agreement':observed,'kappa':(observed-expected)/(1-expected) if expected<1 else None}


def assess_agreement(records):
    labels=[r['labels'] for r in records]
    available=[r for r in labels if r.get('model') is not None]
    scored=[r for r in available if r['model'] in LABELS]
    confusion={actual:{predicted:0 for predicted in LABELS} for actual in LABELS}
    for r in scored:confusion[r['adjudicated']][r['model']]+=1
    negative=[r for r in scored if r['adjudicated']!='understood']
    return {'records':len(records),'synthetic_records':sum(r['provenance']['synthetic'] for r in records),
            'human_agreement':agreement([r['annotator_a'] for r in labels],[r['annotator_b'] for r in labels]),
            'model_agreement_on_nonabstained':agreement([r['adjudicated'] for r in scored],[r['model'] for r in scored]),
            'prediction_coverage':len(available)/len(records) if records else None,
            'nonabstained_coverage':len(scored)/len(records) if records else None,
            'abstentions':sum(r['model']=='uncertain' for r in available),
            'false_understood':{'count':sum(r['model']=='understood' for r in negative),'denominator':len(negative)},
            'confusion':confusion}


def run_experiment(name,config_path=None,smoke=False):
    if not name.replace('_','').isalnum():raise ValueError('Use an experiment folder name')
    folder=PROJECT_ROOT/'experiments'/name
    config_path=(config_path or folder/'config.json').resolve()
    config=json.loads(config_path.read_text())
    if not isinstance(config,dict):raise ValueError('Experiment config must be a JSON object')
    script=folder/'run.py'
    spec=importlib.util.spec_from_file_location('westlake_experiment',script)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    result=module.run(config,smoke=smoke)
    run_id=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]
    destination=PROJECT_ROOT/'results'/name/run_id;destination.mkdir(parents=True,mode=0o700)
    try:
        commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=PROJECT_ROOT,text=True).strip()
        dirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=PROJECT_ROOT,text=True).strip())
    except (OSError,subprocess.CalledProcessError):commit=None;dirty=None
    manifest={'experiment':name,'run_id':run_id,'synthetic_smoke':smoke,'git_commit':commit,'worktree_dirty':dirty,
              'config_sha256':hashlib.sha256(config_path.read_bytes()).hexdigest(),
              'script_sha256':hashlib.sha256(script.read_bytes()).hexdigest(),
              'prompt_inventory':prompt_manifest(),
              'prediction_origin':'supplied labels; this experiment does not call a model'}
    for filename,value in [('metrics.json',result),('manifest.json',manifest)]:
        with os.fdopen(os.open(destination/filename,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'w') as stream:
            json.dump(value,stream,indent=2);stream.write('\n')
    return destination
