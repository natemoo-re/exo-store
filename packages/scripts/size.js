// @ts-nocheck
import { promises as fs } from 'fs';
import bytes from 'bytes';
import path from 'path';
import gzip from 'gzip-size';
import brotli from 'brotli-size';

export default async function size(outdir) {
    const dist = path.resolve(outdir);
    const paths = await readDir(dist);
    const files = await Promise.all(paths.map(file => fs.readFile(file).then(content => ({ file, content }))))
    const sizes = files.map(({ file, content }) => {
        const rawSize = getCompressedSize(content, 'none');
        const gzipSize = getCompressedSize(content, 'gzip');
        const brotliSize = getCompressedSize(content, 'brotli');

        return {
            file: file.slice(dist.length),
            rawSize,
            gzipSize,
            brotliSize
        }
    })

    console.log(sizes);
}

const readDir = async (dir) => {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    return Promise.all(ents.map(ent => ent.isDirectory() ? readDir(path.join(dir, ent.name)) : path.join(dir, ent.name)));
}

const getCompressedSize = (data, compression = 'gzip') => {
  let size
  switch (compression) {
    case 'gzip':
      size = gzip.sync(data)
      break
    case 'brotli':
      size = brotli.sync(data)
      break
    case 'none':
    default:
      size = Buffer.byteLength(data)
  }

  return bytes(size)
}
