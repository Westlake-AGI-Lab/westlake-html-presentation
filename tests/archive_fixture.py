"""Generate a disposable non-sensitive browser import fixture outside the repository."""
import json
from pathlib import Path
import tempfile
import zipfile
import io
from PIL import Image

target=Path(tempfile.mkdtemp(prefix='ppt-archive-test-'))/'learning-test.zip'
buffer=io.BytesIO();Image.new('RGB',(16,16),(30,90,160)).save(buffer,format='PNG');image=buffer.getvalue()
messages=[{'role':'user','text':'Archive restoration test / 档案恢复测试','images':[{'name':'pixel.png','path':'attachments/pixel.png'}],'page':{'number':1,'title':'Test'},'status':'complete'},
          {'role':'assistant','text':'Restored formula: $x_t = \\sqrt{a} x_0$.\n\nPartial answer.','images':[],'status':'stopped'}]
with zipfile.ZipFile(target,'w') as z:
    z.writestr('manifest.json',json.dumps({'format':'westlake-learning','version':1,'deck':'test-fixture'}))
    z.writestr('conversations.json',json.dumps([{'name':'Import verification','messages':messages}]))
    z.writestr('attachments/pixel.png',image)
print(target)
