import copy
import hashlib
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import _bootstrap
from westlake_ppt.prompts import load_prompt, prompt_manifest
from westlake_ppt.research import agreement, assess_agreement, load_dataset, validate_record, write_dataset
from westlake_ppt.cli import main


def record():
    return {'id':'one','concept_id':'projection','question':'Why?','answer':'Synthetic answer',
            'language':'en','kind':'explain','source':{'deck_id':'fixture','revision':'v1','page':1,'quote':'Fixture'},
            'labels':{'annotator_a':'misunderstood','annotator_b':'partial','adjudicated':'misunderstood','model':'understood'},
            'provenance':{'synthetic':True}}


class ResearchTests(unittest.TestCase):
    def test_cli_reports_output_errors_without_tracebacks(self):
        with patch('westlake_ppt.research.load_dataset',return_value=[record()]), \
             patch('westlake_ppt.research.write_dataset',side_effect=FileExistsError('Output already exists')), \
             contextlib.redirect_stderr(io.StringIO()) as output:
            with self.assertRaises(SystemExit) as error:
                main(['dataset','build','--input','fixture.jsonl','--output','data/existing.jsonl'])
        self.assertEqual(error.exception.code,2)
        self.assertIn('Output already exists',output.getvalue())
        self.assertNotIn('Traceback',output.getvalue())

    def test_cli_rejects_invalid_experiment_configs(self):
        with tempfile.TemporaryDirectory() as tmp:
            config=Path(tmp)/'config.json'
            for value,message in [([], 'JSON object'), ({}, 'input dataset path')]:
                config.write_text(json.dumps(value))
                with contextlib.redirect_stderr(io.StringIO()) as output:
                    with self.assertRaises(SystemExit) as error:
                        main(['eval','assessment_agreement','--config',str(config)])
                self.assertEqual(error.exception.code,2)
                self.assertIn(message,output.getvalue())

    def test_kappa_known_case_and_undefined(self):
        result=agreement(['a','a','b','b'],['a','b','a','b'])
        self.assertEqual(result['agreement'],.5);self.assertEqual(result['kappa'],0)
        self.assertEqual(agreement(['a','b'],['a','b'])['kappa'],1)
        self.assertIsNone(agreement(['a'],['a'])['kappa'])
        self.assertIsNone(agreement([],[])['agreement'])

    def test_uncertainty_and_false_understood_are_not_hidden(self):
        rows=[record(),copy.deepcopy(record())];rows[1]['labels']['model']='uncertain'
        result=assess_agreement(rows)
        self.assertEqual(result['abstentions'],1)
        self.assertEqual(result['nonabstained_coverage'],.5)
        self.assertEqual(result['false_understood'],{'count':1,'denominator':1})

    def test_human_consent_and_schema(self):
        row=record();row['provenance']={'synthetic':False}
        with self.assertRaises(ValueError):validate_record(row)
        row['provenance'].update(consent=True,deidentified=True,ethics_reference='test-only-exemption')
        validate_record(row)
        row['source']['page']=True
        with self.assertRaises(ValueError):validate_record(row)

    def test_duplicates_and_output_boundary(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'rows.jsonl';path.write_text((json.dumps(record())+'\n')*2)
            with self.assertRaises(ValueError):load_dataset(path)
            with self.assertRaises(ValueError):write_dataset([record()],Path(tmp)/'export.jsonl')

    def test_prompt_texts_match_migration_manifest(self):
        import westlake_ppt.prompts as prompts
        expected=json.loads((Path(prompts.__file__).parent/'manifest.json').read_text())['sha256']
        self.assertEqual(prompt_manifest(),expected)
        for name,digest in expected.items():self.assertEqual(hashlib.sha256(load_prompt(name).encode()).hexdigest(),digest)
        with self.assertRaises(ValueError):load_prompt('../secret.txt')
