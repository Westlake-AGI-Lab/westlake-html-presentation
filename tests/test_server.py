import base64
import importlib.util
import io
import json
from pathlib import Path
import threading
import unittest
from unittest.mock import patch
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from PIL import Image

spec = importlib.util.spec_from_file_location('ppt_server', Path(__file__).resolve().parents[1] / 'server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

def picture(fmt='PNG', mime='image/png'):
    out = io.BytesIO()
    Image.new('RGB', (8, 8), 'blue').save(out, format=fmt)
    return {'dataUrl': 'data:' + mime + ';base64,' + base64.b64encode(out.getvalue()).decode()}

def payload():
    return {'question':'解释', 'slides':[{'number':1,'title':'测试','content':'公式'}], 'currentSlide':{'number':1,'title':'测试'}}

class FakeResponse(io.BytesIO):
    headers = {'Content-Type':'text/event-stream'}

class ValidationTests(unittest.TestCase):
    def test_response_language(self):
        self.assertIn('默认用清晰中文', server.build_request(payload())['instructions'])
        english = server.build_request(dict(payload(), language='en'))
        self.assertIn('Answer in clear English', english['instructions'])
        self.assertIn('Slide N', english['instructions'])
        self.assertNotIn('默认用清晰中文', english['instructions'])
        for invalid in ['fr', '', None, 1]:
            with self.assertRaises(ValueError):
                server.build_request(dict(payload(), language=invalid))
    def test_sharing_limits(self):
        limits = server.RequestLimits(hourly=1, daily=2, concurrent=1)
        self.assertIsNone(limits.acquire('a'))
        self.assertIsNotNone(limits.acquire('b'))
        limits.release()
        self.assertIsNotNone(limits.acquire('a'))
        self.assertIsNone(limits.acquire('b'))
        limits.release()
        self.assertIsNotNone(limits.acquire('c'))
        with patch.object(server.time, 'time', return_value=server.time.time()+86400):
            self.assertIsNone(limits.acquire('c'))
        limits.release()

    def test_supported_images(self):
        for fmt,mime in [('PNG','image/png'),('JPEG','image/jpeg'),('WEBP','image/webp')]:
            self.assertEqual(server.validate_images([picture(fmt,mime)])[0]['type'],'input_image')

    def test_invalid_images(self):
        for image in [{'dataUrl':'https://example.com/a.png'}, {'dataUrl':'data:image/png;base64,AAAA'}, picture('JPEG','image/png'), {'dataUrl':'data:image/svg+xml;base64,AAAA'}, {'dataUrl':'data:image/png;base64,'+'A'*1500000}]:
            with self.assertRaises(ValueError): server.validate_images([image])
        with self.assertRaises(ValueError): server.validate_images([picture()]*4)
        item=picture(); item['dataUrl']=item['dataUrl'][:-12]
        with self.assertRaises(ValueError): server.validate_images([item])

    def test_image_context_and_legacy(self):
        p=payload(); self.assertFalse(server.build_request(p)['stream'])
        p['images']=[picture()];p['question']='';p['history']=[{'role':'user','text':'上图','images':[picture()]}]
        body=server.build_request(p)
        self.assertEqual(body['input'][-1]['content'][1]['type'],'input_image')
        self.assertEqual(body['input'][1]['content'][1]['type'],'input_image')
        self.assertFalse(body['store'])
        p['history']=[{'role':'user','text':'图','images':[picture()]*3}]*2
        with self.assertRaises(ValueError): server.build_request(p)

    def test_malformed_context(self):
        for changes in [{'slides':[None]}, {'history':[None]}, {'currentSlide':{'number':999}}, {'stream':'yes'}]:
            with self.assertRaises(ValueError): server.build_request(dict(payload(),**changes))

    def run_stream(self, events):
        raw=''.join('data: '+json.dumps(e,ensure_ascii=False)+'\n\n' for e in events).encode()
        output=[]
        with patch.object(server,'open_upstream',return_value=FakeResponse(raw)):
            server.stream_response(server.build_request(dict(payload(),stream=True)),output.append)
        return output

    def test_stream_unicode_and_complete(self):
        output=self.run_stream([{'type':'response.output_text.delta','delta':'公式 α'}, {'type':'response.completed','response':{'model':'mock'}}])
        self.assertEqual([x['type'] for x in output],['start','delta','done'])
        self.assertEqual(output[1]['text'],'公式 α')

    def test_stream_failures(self):
        for events in [[],[{'type':'response.output_text.delta','delta':'partial'}],[{'type':'response.incomplete'}],[{'type':'response.failed'}]]:
            with self.assertRaises(RuntimeError): self.run_stream(events)

    def test_client_disconnect(self):
        with patch.object(server,'open_upstream',return_value=FakeResponse(b'')):
            with self.assertRaises(BrokenPipeError):
                server.stream_response(server.build_request(payload()),lambda event: (_ for _ in ()).throw(BrokenPipeError()))

class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd=server.ThreadingHTTPServer(('127.0.0.1',0),server.PresentationHandler)
        cls.base='http://127.0.0.1:'+str(cls.httpd.server_port)
        cls.thread=threading.Thread(target=cls.httpd.serve_forever,daemon=True);cls.thread.start()

    @classmethod
    def tearDownClass(cls): cls.httpd.shutdown();cls.httpd.server_close()

    def test_static_get_and_head(self):
        for method in ['GET','HEAD']:
            for path in ['/server.py','/.env','/assets/','/assets/../server.py','/%2e%2e/server.py','/requirements.txt']:
                with self.assertRaises(HTTPError) as error: urlopen(Request(self.base+path,method=method))
                self.assertEqual(error.exception.code,404)
            for path in ['/','/assets/chat.js','/assets/chat.css','/assets/i18n.js','/assets/thumbnails.js','/assets/thumbnails.css','/assets/classroom.js','/assets/classroom.css','/assets/archive.js','/assets/vendor/fflate/fflate.js','/assets/vendor/qrcode/qrcode.js','/assets/vendor/mathjax/es5/tex-chtml.js',
                         '/assets/region.js','/assets/region.css','/assets/vendor/html2canvas/html2canvas.min.js','/assets/vendor/lucide/scan.svg']:
                with urlopen(Request(self.base+path,method=method)) as response:
                    self.assertEqual(response.status,200)
                    response.read()

    def test_bad_origin_and_size(self):
        for headers,code in [({'Origin':'https://foreign.test'},403),({'Content-Length':str(server.MAX_REQUEST_BYTES+1)},413)]:
            with self.assertRaises(HTTPError) as error: urlopen(Request(self.base+'/api/chat',data=b'{}',headers=headers))
            self.assertEqual(error.exception.code,code)

    def test_host_and_network_restriction(self):
        with self.assertRaises(HTTPError) as error:
            urlopen(Request(self.base+'/', headers={'Host':'foreign.test'}))
        self.assertEqual(error.exception.code,403)
        with patch.object(server, 'ALLOWED_NETWORKS', []):
            for method in ['GET', 'HEAD', 'POST']:
                with self.assertRaises(HTTPError) as error:
                    urlopen(Request(self.base+'/', method=method, data=b'{}' if method=='POST' else None))
                self.assertEqual(error.exception.code,403)

    def test_legacy_json(self):
        with patch.object(server,'open_upstream',return_value=FakeResponse(b'{"output_text":"legacy answer"}')):
            with urlopen(Request(self.base+'/api/chat',data=json.dumps(payload()).encode())) as response:
                self.assertEqual(json.load(response)['answer'],'legacy answer')

if __name__=='__main__': unittest.main()
