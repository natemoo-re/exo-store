// @ts-nocheck
import { promises as fs } from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import config from './esbuild.config.js';

export default async function build(...args) {
    const [entryPoint, ...flags] = args;
    const entryPoints = [path.resolve(entryPoint)]
    const watch = !!flags.find(flag => flag === '--watch' || flag === '-w');
    const outdir = 'dist';

    await clean(outdir);
    const builder = await esbuild.build({
        ...config,
        entryPoints,
        outdir,
        watch
    })

    if (!watch) return;

    process.on('beforeExit', () => {
        builder.stop();
    })
}

async function clean(outdir) {
    const dist = path.resolve(outdir);

    try {
        if (await fs.readdir(dist)) {
            await fs.rmdir(dist, { recursive: true });
            return;
        }
    } catch (e) {
        console.log(e.code);
        if (e.code !== 'ENOENT') throw e;
    }
    return;
}
