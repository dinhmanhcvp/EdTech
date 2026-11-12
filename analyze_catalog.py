import json

with open('docs/tai-lieu-nghien-cuu-stem/think_community_full_458.json', 'r', encoding='utf-8') as f:
    posts = json.load(f)

phys_sims = [p for p in posts if p.get('subject', {}).get('name') == 'Vật lý']
print(f"Tổng số bài Vật lý: {len(phys_sims)}")
for i, p in enumerate(phys_sims, 1):
    desc = (p.get('description') or '').replace('\n', ' ')
    print(f"{i:2d}. [{p.get('grade', {}).get('name')}] \"{p.get('title')}\"")
    print(f"    -> {desc[:110]}...")
