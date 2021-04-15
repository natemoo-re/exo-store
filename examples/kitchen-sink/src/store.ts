import { createStore, $ } from '@exo-store/core';

const initialState = {
  status: 'loading',
  preact: 0,
  vue: 0,
  total: 0,
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
const store = createStore(async () => {
  await sleep(1000);
  return {...initialState, status: 'done', preact: 10 }
}, initialState);
const { compute } = store[$];

store.total = compute((s) => s.preact + s.vue);

export default store;
