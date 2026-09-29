import sys
import pathlib
from PIL import Image
D = pathlib.Path(__file__).resolve().parent
names=sys.argv[1:]
c=Image.new('RGB',(1440,810*((len(names)+1)//2)//2))
for i,n in enumerate(names):
    im=Image.open(D / f'{n}.png').resize((720,405))
    c.paste(im,((i%2)*720,(i//2)*405))
c.save(D / 'grid.png')
