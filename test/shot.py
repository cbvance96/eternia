import sys, asyncio
from playwright.async_api import async_playwright
async def main(url, out, wait, w, h):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':w,'height':h})
        logs=[]
        pg.on('console', lambda m: logs.append(m.type+': '+m.text))
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: '+str(e)))
        await pg.goto(url)
        await pg.wait_for_timeout(wait)
        await pg.screenshot(path=out)
        print('TITLE', await pg.title())
        for l in logs[:30]: print(l)
        await b.close()
asyncio.run(main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv)>3 else 500, int(sys.argv[4]) if len(sys.argv)>4 else 1440, int(sys.argv[5]) if len(sys.argv)>5 else 810))
