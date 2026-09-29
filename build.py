"""Build Eternia: inline every src/*.js file into template.html.

    python build.py                 # writes index.html next to this file
    python build.py path/out.html   # writes somewhere else
"""
import glob, os, sys

here = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'index.html')
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(here, 'src', '*.js'))))
html = open(os.path.join(here, 'template.html'), encoding='utf-8').read().replace('/*__SCRIPT__*/', js)
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
open(os.path.join(here, 'dist.js'), 'w', encoding='utf-8').write(js)   # for `node --check dist.js`
print(f'{out}: {len(html):,} bytes')
