"""Boundary checks plus opt-in real local WASI isolation smoke tests; no online compiler."""
import json
import os
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from westlake_ppt import cpp_runner
from westlake_ppt.server import app as server


class CppRunnerTests(unittest.TestCase):
    def test_disabled_by_default_and_payload_limits(self):
        with patch.dict(os.environ, {'CPP_RUNNER_ENABLED':'0'}):
            self.assertFalse(cpp_runner.status()['enabled'])
            self.assertEqual(cpp_runner.run({'code':'int main(){}'})[0],503)
        for payload in ([], {}, {'code':''}, {'code':'x'*24001}, {'code':'x','stdin':3}):
            with self.assertRaises(ValueError): cpp_runner.run(payload)

    def test_http_requires_same_origin_and_caps_body(self):
        httpd=server.ThreadingHTTPServer(('127.0.0.1',0),server.PresentationHandler)
        thread=threading.Thread(target=httpd.serve_forever,daemon=True);thread.start()
        base='http://127.0.0.1:'+str(httpd.server_port)
        try:
            for origin in (None,'https://elsewhere.invalid'):
                headers={'Content-Type':'application/json'}
                if origin:headers['Origin']=origin
                with self.assertRaises(HTTPError) as error:urlopen(Request(base+'/api/cpp/run',data=b'{"code":"x"}',headers=headers))
                self.assertEqual(error.exception.code,403)
            with self.assertRaises(HTTPError) as error:urlopen(Request(base+'/api/cpp/run',data=b'x'*32769,headers={'Origin':base}))
            self.assertEqual(error.exception.code,413)
            with patch.dict(os.environ,{'CPP_RUNNER_ENABLED':'0'}):
                status=json.load(urlopen(base+'/api/cpp/status'));self.assertFalse(status['enabled'])
                with self.assertRaises(HTTPError) as error:urlopen(Request(base+'/api/cpp/run',data=b'{"code":"x"}',headers={'Origin':base}))
                self.assertEqual(error.exception.code,503)
        finally:httpd.shutdown();httpd.server_close()

    @unittest.skipUnless(os.environ.get('CPP_RUNNER_ENABLED')=='1','Optional local WASI compiler is not enabled')
    def test_real_guest_cannot_read_host_files_or_server_credentials(self):
        code='''#include <iostream>
#include <fstream>
#include <cstdlib>
int main(){
 std::ifstream f("/etc/passwd");
 std::cout << (f.good()?"HOST_VISIBLE":"HOST_BLOCKED") << "\\n";
 std::cout << (std::getenv("CPP_ISOLATION_TEST_SECRET")?"ENV_VISIBLE":"ENV_BLOCKED") << "\\n";
}'''
        with patch.dict(os.environ,{'CPP_ISOLATION_TEST_SECRET':'test-only-not-a-real-key'}):
            status,result=cpp_runner.run({'code':code})
        self.assertEqual(status,200);self.assertEqual(result['kind'],'complete',result)
        self.assertEqual(result['stdout'],'HOST_BLOCKED\nENV_BLOCKED\n')

    @unittest.skipUnless(os.environ.get('CPP_RUNNER_ENABLED')=='1','Optional local WASI compiler is not enabled')
    def test_real_wasm_memory_cap_and_compiler_filesystem(self):
        code='''#include <cstdlib>
#include <iostream>
int main(){
 volatile char* p=(volatile char*)std::malloc(300u*1024u*1024u);
 if(!p){std::cout<<"LIMIT\\n";return 0;}
 p[0]=7;p[300u*1024u*1024u-1]=9;
 std::cout<<int(p[0])+int(p[300u*1024u*1024u-1]);
}'''
        status,result=cpp_runner.run({'code':code})
        self.assertEqual(status,200);self.assertEqual(result['kind'],'complete',result)
        self.assertEqual(result['stdout'],'LIMIT\n')
        status,result=cpp_runner.run({'code':'#include "/etc/passwd"\nint main(){}'})
        self.assertEqual(status,200);self.assertEqual(result['kind'],'error',result)
        self.assertIn('file not found',result['stderr'])
