import urllib.request
import ssl
import json
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def query_api(endpoint):
    url = f'https://think.pro.vn/api/v1{endpoint}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=20) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data.get('data', data)
    except Exception as e:
        print(f"Error fetching {endpoint}: {e}")
        return None

all_posts = []
page = 1
pageSize = 24  # Standard grid size

print("Fetching all community posts with pageSize=24...")
while True:
    res = query_api(f'/public/community/posts?page={page}&pageSize={pageSize}')
    if not res or 'items' not in res or len(res['items']) == 0:
        break
    items = res['items']
    all_posts.extend(items)
    print(f"Page {page}: +{len(items)} items -> Total: {len(all_posts)} / {res.get('total')}")
    if len(all_posts) >= res.get('total', 0):
        break
    page += 1
    time.sleep(0.15)

output_path = 'docs/tai-lieu-nghien-cuu-stem/think_community_full_458.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_posts, f, ensure_ascii=False, indent=2)

print(f"\nSuccessfully saved {len(all_posts)} posts to {output_path}!")
