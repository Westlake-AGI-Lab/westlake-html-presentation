"""Local metric calculation over supplied predictions; never calls a model."""
import hashlib
from pathlib import Path
from westlake_ppt.config import PROJECT_ROOT
from westlake_ppt.research import assess_agreement, load_dataset, validate_record


def run(config,smoke=False):
    if smoke:
        records=[]
        for i,(a,b,model) in enumerate([('understood','understood','understood'),('partial','partial','uncertain'),
                                       ('misunderstood','partial','understood'),('misunderstood','misunderstood','misunderstood')]):
            records.append(validate_record({'id':str(i),'concept_id':'synthetic','question':'Synthetic fixture question',
                'answer':'Synthetic fixture answer','language':'en','kind':'explain',
                'source':{'deck_id':'synthetic','revision':'fixture-v1','page':1,'quote':'Synthetic fixture'},
                'labels':{'annotator_a':a,'annotator_b':b,'adjudicated':a,'model':model},'provenance':{'synthetic':True}}))
        digest=None
    else:
        if not isinstance(config.get('input'),str) or not config['input'].strip():
            raise ValueError('Assessment config requires an input dataset path')
        path=Path(config['input']);path=path if path.is_absolute() else PROJECT_ROOT/path
        records=load_dataset(path);digest=hashlib.sha256(path.read_bytes()).hexdigest()
    return dict(assess_agreement(records),input_sha256=digest,synthetic_smoke=smoke)
