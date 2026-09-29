import sys, asyncio, json, os, pathlib
from playwright.async_api import async_playwright
# usage: run.py query  steps_json
async def main(query, steps, w=1440, h=810):
    async with async_playwright() as p:
        chrome = os.environ.get('CHROME_PATH')
        args = ['--autoplay-policy=no-user-gesture-required']
        b = await p.chromium.launch(executable_path=chrome, args=args) if chrome else await p.chromium.launch(args=args)
        pg = await b.new_page(viewport={'width':w,'height':h})
        logs=[]
        pg.on('console', lambda m: logs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: '+str(e)))
        page = os.environ.get('ETERNIA_HTML', str(pathlib.Path(__file__).resolve().parent.parent / 'index.html'))
        await pg.goto(pathlib.Path(page).resolve().as_uri() + query)
        for st in steps:
            if 'eval' in st:
                r = await pg.evaluate(st['eval'])
                if r is not None: print('EVAL', r)
            if 'wait' in st: await pg.wait_for_timeout(st['wait'])
            if 'shot' in st: await pg.screenshot(path=str(pathlib.Path(__file__).resolve().parent / (st['shot'] + '.png'))); print('shot', st['shot'])
        for l in logs[:30]: print(l)
        await b.close()
w = int(sys.argv[3]) if len(sys.argv)>3 else 1440
h = int(sys.argv[4]) if len(sys.argv)>4 else 810
asyncio.run(main(sys.argv[1], json.loads(sys.argv[2]), w, h))
