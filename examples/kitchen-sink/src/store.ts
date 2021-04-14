import { createStore, $ } from '@exo-store/core';

const initialState = {
  preact: 0,
  vue: 0,
  total: 0,
};

const store = createStore(initialState);
const { compute } = store[$];

store.total = compute((s) => s.preact + s.vue);

export default store;
