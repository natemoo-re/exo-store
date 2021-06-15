#!/usr/bin/env node

async function cli() {
    const [cmd, ...args] = process.argv.slice(2);

    switch (cmd) {
        case 'build': {
            const { default: build } = await import('./build.js');
            build(...args);
            break;
        }
        case 'dev': {
            const { default: build } = await import('./build.js');
            build(...args, '--watch')
            break;
        }
        case 'size': {
            const { default: size } = await import('./size.js');
            size(...args);
            break;
        }
    }
}

cli();
