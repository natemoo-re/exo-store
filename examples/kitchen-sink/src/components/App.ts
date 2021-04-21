import { $ } from '@exo-store/core';
import store from '../store';

const { subscribe, ready } = store[$]
const root = document.querySelector('#total')!;
const pre = document.querySelector('#store')!;

const updatePre = () => {
    pre.textContent = JSON.stringify(store, null, 2);
}

export default async () => {
    // Print the fallback store state while store initializes
    root.textContent = [`total: ${store.total}`, `ready: false`].join('\n');
    updatePre();

    // Wait for the store to asynchronously initialize
    await ready();
    
    // Print the initialized store state
    root.textContent = [`total: ${store.total}`, `ready: true`].join('\n');
    updatePre();
    
    // Only called for changes *after* the store has been initialized
    subscribe(store => {
        console.log('Initialized');
        root.textContent = [
            `total: ${store.total}`,
            `ready: true`
        ].join('\n');
        updatePre();
    })
}
