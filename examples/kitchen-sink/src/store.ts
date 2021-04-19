import { createStore, $ } from '@exo-store/core';

const initialState = {
  status: 'loading',
  preact: 0,
  vue: 0,
  total: 0,
  deeply: { nested: { value: 0 }}
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
const store = createStore(async () => {
  await sleep(500 + Math.random() * 2000);
  return { ...initialState, status: 'done', preact: 10 }
}, initialState);
const { compute } = store[$];

store.total = compute((s) => s.preact + s.vue);

setInterval(() => {
  store.deeply.nested.value++;
}, 5000)

export default store;
