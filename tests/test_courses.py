import json
from pathlib import Path
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from westlake_ppt.courses import catalog, render_lecture
from westlake_ppt.server import app as server


class CourseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd=server.ThreadingHTTPServer(('127.0.0.1',0),server.PresentationHandler)
        cls.base='http://127.0.0.1:'+str(cls.httpd.server_port)
        cls.thread=threading.Thread(target=cls.httpd.serve_forever,daemon=True);cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown();cls.httpd.server_close()

    def test_catalog_and_sample_isolation(self):
        with urlopen(self.base+'/api/courses') as response:
            courses=json.load(response)['courses']
        self.assertEqual(len(courses),4)
        for course in courses:
            for lecture in course['lectures']:
                self.assertNotIn('slides',lecture)
                with urlopen(self.base+'/'+lecture['href']) as response:
                    source=response.read().decode()
                self.assertIn('class="slide course-slide'+(' pdf-source-slide' if lecture.get('source') else '')+'"',source)
                self.assertIn('westlake-course-'+course['id']+'-'+lecture['id'],source)
                for integration in ('classroom','learning','quiz','eigen-demo','improvements'):
                    self.assertNotIn('src="assets/'+integration+'.js"',source)
                self.assertIn('src="assets/chat.js"',source)
                self.assertIn('src="assets/catalog-link.js"',source)
                self.assertIn('role:"solo"',source)

    def test_routes_reject_unknowns_and_main_deck_classroom(self):
        for query,code in [('course=unknown&lecture=search',404),('course=calculus&lecture=unknown',404),
                           ('course=calculus&lecture=derivatives&mode=student',400),
                           ('course=calculus&lecture=derivatives&room=ABC123',400),
                           ('course=../server.py&lecture=search',404)]:
            with self.assertRaises(HTTPError) as error:urlopen(self.base+'/lecture.html?'+query)
            self.assertEqual(error.exception.code,code)

    def test_head_and_explicit_public_files(self):
        for path in ['/courses.html','/api/courses','/assets/courses.css','/assets/courses.js','/assets/course-player.css',
                     '/lecture.html?course=calculus&lecture=derivatives']:
            with urlopen(Request(self.base+path,method='HEAD')) as response:
                self.assertEqual(response.status,200)
                self.assertEqual(response.read(),b'')
        for path in ['/assets/courses.json','/src/westlake_ppt/courses.py']:
            with self.assertRaises(HTTPError) as error:urlopen(self.base+path)
            self.assertEqual(error.exception.code,404)

    def test_dashboard_home_is_opt_in(self):
        with urlopen(self.base+'/') as response:self.assertNotIn(b'id="courseGrid"',response.read())
        self.httpd.catalog_home=True
        try:
            with urlopen(self.base+'/') as response:self.assertIn(b'id="courseGrid"',response.read())
            with urlopen(self.base+'/?mode=teacher') as response:self.assertNotIn(b'id="courseGrid"',response.read())
        finally:self.httpd.catalog_home=False

    def test_source_lecture_content_and_original_pdf(self):
        import hashlib
        courses=catalog(server.BASE_DIR)
        course=courses[0]; lecture=course['lectures'][0]
        self.assertEqual((course['code'],course['instructor'],course['term']),('2610CST3004','Huan Wang','Fall 2026'))
        self.assertEqual(lecture['id'],'lecture-07-tomasulo')
        self.assertEqual([s['sourcePage'] for s in lecture['slides']],list(range(1,25)))
        self.assertEqual(len(course['lectures']),3)
        with urlopen(self.base+'/'+lecture['source']['file']) as response:
            body=response.read();self.assertEqual(response.headers.get_content_type(),'application/pdf')
        self.assertTrue(body.startswith(b'%PDF-'))
        self.assertEqual(hashlib.sha256(body).hexdigest(),lecture['source']['sha256'])
        for slide in lecture['slides']:
            for key in ('image','thumbnail'):
                with urlopen(Request(self.base+'/'+slide[key],method='HEAD')) as response:
                    self.assertEqual(response.status,200)
                    self.assertEqual(response.headers.get_content_type(),'image/webp')
                    self.assertGreater(int(response.headers['Content-Length']),0)
        for path in ['/assets/lectures/cst3004-lecture07/provenance.json','/assets/lectures/cst3004-lecture07/','/assets/lectures/cst3004-lecture07/page-99.webp']:
            with self.assertRaises(HTTPError) as error:urlopen(self.base+path)
            self.assertEqual(error.exception.code,404)

    def test_source_lecture_is_text_grounded_and_separate(self):
        course=catalog(server.BASE_DIR)[0];lecture=course['lectures'][0]
        source=render_lecture((server.BASE_DIR/server.HTML_NAME).read_text(),course,lecture)
        self.assertEqual(source.count('class="slide course-slide pdf-source-slide"'),24)
        self.assertIn('class="source-transcript" hidden',source)
        self.assertIn('Reservation Stations: Value or Provenance',source)
        self.assertIn('assets/source-lecture.js',source)
        self.assertIn('assets/source-lecture.css',source)
        self.assertIn('class="source-caption" data-editable',source)
        self.assertNotIn('data-editable',source[source.index('<img class="source-page-image"'):source.index('alt="Source slide')])
        self.assertNotIn('src="assets/learning.js"',source)
        self.assertIn('PDF contains a static snapshot',source)
