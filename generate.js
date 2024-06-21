import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { createCanvas, loadImage } from 'canvas';

const sizes = [
  64,
  72,
  96,
  128,
  512,
  728,
];

/**
 * @type {Array<{href: string, name: string, src: string}>}
 */
const data = JSON.parse(await fs.readFile("data.json"));
const dataWithImage = await Promise.all(
  data.map(async item => {
    const idMatch = /https?:\/\/(www\.)?([^.]+)/.exec(item.href);
    const id = idMatch[2];
    const filename = `${id}.jpg`;

    const filenameSrc = decodeURIComponent(new URL(item.src).pathname.split("/").at(-1));
    const image = await loadImage(`images/${filenameSrc}`);
    return {
      ...item,
      image,
      filename,
      id,
    }
  })
);

dataWithImage.sort((a, b) => {
  if (a.id > b.id) return 1
  if (a.id < b.id) return -1
  return 0
})


await fs.mkdir("public", { recursive: true });

const html = await fs.readFile("index.template.html", 'utf8');

const placeholder = [];

for (const item of dataWithImage) {
  const el = `<div class="flex flex-col item">
      <div class="gap-lg flex">
        <div class="flex gap flex-col">
          <img src="/${item.filename}" alt="" width="72" height="72" class="logo rounded">
          <img src="/${item.filename}" alt="" width="72" height="72" class="logo">  
        </div>
        <div class="flex-col flex gap">
          <h3 class="type">${item.name}</h3>
          <div class="flex flex-col gap">
            <a target="_blank" href="/${item.id}.jpg"><code class="code">https://govatar.netlify.app/${item.id}.jpg</code></a>
            <a target="_blank" href="/${item.id}-64.jpg"><code class="code">https://govatar.netlify.app/${item.id}-64.jpg</code></a>
            <a target="_blank" href="/${item.id}-96.jpg"><code class="code">https://govatar.netlify.app/${item.id}-92.jpg</code></a>
            <a target="_blank" href="/${item.id}-128.jpg"><code class="code">https://govatar.netlify.app/${item.id}-128.jpg</code></a>
            <a target="_blank" href="/${item.id}-512.jpg"><code class="code">https://govatar.netlify.app/${item.id}-512.jpg</code></a>
            <a target="_blank" href="/${item.id}-728.jpg"><code class="code">https://govatar.netlify.app/${item.id}-728.jpg</code></a>
          </div>
        </div>
      </div>     
    </div>
`.trim()
  placeholder.push(el);
}

const out = html.replace('<!-- placeholder -->',
  placeholder.join("")
)

await fs.writeFile("index.html", out, 'utf8');

const debug = false;

for (const size of sizes) {
  for (const item of dataWithImage) {

    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const image = item.image;
    const scale = (image.height / image.width);

    const padding = size * 0.067;
    const imageSize = size - padding * 2;

    let offsetX = 0;
    let offsetY = 0;

    if (scale < 1) {
      offsetY = (size - imageSize * scale) / 2;
      offsetX = padding
      ctx.drawImage(image, offsetX, offsetY, imageSize, imageSize * scale);
    } else {
      offsetX = (size - imageSize / scale) / 2
      offsetY = padding;
      ctx.drawImage(image, offsetX, offsetY, imageSize / scale, imageSize);
    }

    if (debug) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.strokeStyle = 'magenta';
      ctx.lineWidth = 4;

      const radius = (size / 2) - ctx.lineWidth * 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
      ctx.stroke();
    }

    const buffer = canvas.toBuffer('image/jpeg', { quality: 1 });

    if (size === 512) {
      await fs.writeFile(`public/${item.id}.jpg`, buffer);
    }

    await fs.writeFile(`public/${item.id}-${size}.jpg`, buffer);
  }
}