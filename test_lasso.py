import urllib.request
import io
import sys

boundary = '----WebKitFormBoundaryTest12345'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="hint_subject"\r\n\r\n'
    f'PHYS_PENDULUM\r\n'
    f'--{boundary}--\r\n'
).encode('utf-8')

req = urllib.request.Request(
    'http://localhost:8000/api/v1/canvas/compile-lasso',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
res = urllib.request.urlopen(req)
sys.stdout.buffer.write(res.read() + b'\n')
