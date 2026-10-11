import tempfile
import unittest
from pathlib import Path

import eigen_demo


class EigenDemoTests(unittest.TestCase):
    def test_source_mapping_and_isolated_build(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp)/'preview'
            eigen_demo.build(destination)
            deck = (destination/'deck.html').read_text()
            self.assertTrue((destination/'presenter.html').is_file())
            self.assertEqual(deck.count('class="slide eigen-slide"'), 16)
            for c in eigen_demo.CONCEPTS:
                self.assertIn(c['source'], eigen_demo.SLIDES[c['page']-1][3])
                self.assertIn(f'source p. {c["page"]}', deck)
                self.assertEqual(len(c['tasks'][0]['hints']), 2)
            with self.assertRaises(SystemExit):
                eigen_demo.build(destination)

    def test_lecture_eigenpairs(self):
        examples = [((.64,.48,.48,.36),(4,3),1),
                    ((.64,.48,.48,.36),(-3,4),0),
                    ((.86,.08,-.12,1.14),(100,300),1.1),
                    ((.86,.08,-.12,1.14),(200,100),.9),
                    ((1,2,4,3),(1,2),5), ((1,2,4,3),(1,-1),-1)]
        for (a,b,c,d),(x,y),eigenvalue in examples:
            self.assertAlmostEqual(a*x+b*y,eigenvalue*x)
            self.assertAlmostEqual(c*x+d*y,eigenvalue*y)


if __name__ == '__main__':
    unittest.main()
