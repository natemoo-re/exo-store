<h1 align="center">Exo Store</h1>

<div align="center">
  <img src="https://raw.githubusercontent.com/natemoo-re/exo-store/main/assets/planet.svg?sanitize=true&v=1"
      alt="Planet" />
</div>

**I made [a bold claim](https://twitter.com/n_moore/status/1381999074702979073) and I regret it. 🤷**

Anyway this is an experimental (and unpublished) state management library.

---

Aren't there a number of other Proxy-based state management libraries? Yes. So what's unique about Exo? It's designed for [Islands](https://jasonformat.com/islands-architecture/)-based applications like those generated by [Astro](https://www.youtube.com/watch?v=mgkwZqVkrwo).

Frameworks each have a unique approach to sharing state **within** an application. Tools like Astro break frameworks' assumption that there is _one single application_—your components are mounted as many small applications, possibly even using different frameworks.

Exo allows you to share global state _between_ applications via `createStore`. The best possible state management library is one that operates like any other JavaScript object ([`const store = {}`](https://twitter.com/mehdi_vasigh/status/1382013259327418382)), which is why `createStore` (kinda) just returns the object you pass to it. You're free to mutate the result however you want from anywhere in your application(s).

Welcome to the **Bring Your Own Framework™** party. Exo (currently) has integrations with React, Preact, and Vue. The `useStore` hook will re-render your component any time your `Store` (or [a particular subset of it](#Selectors)) is updated.

## Try it out

1. Clone me.
2. Run `yarn && yarn start`.

## API

1. Create a store.

```ts
import { createStore } from '@exo-store/core';

const store = createStore({ count: 0 });

export default store;
```

2. Use your store inside your components.

**React/Preact**

```tsx
import { useStore } from '@exo-store/preact';
import Store from '../store';

const Component = () => {
  const store = useStore(Store);
  const subtract = () => store.count--;
  const add = () => store.count++;

  return (
    <div>
      <button onClick={subtract}>-</button>
      <div>{store.count}</div>
      <button onClick={add}>+</button>
    </div>
  );
};
```

**Vue**

```vue
<template>
  <div>
    <button @click="subtract">-</button>
    <div>{{ store.count }}</div>
    <button @click="add">+</button>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import { useStore } from '@exo-store/vue';
import Store from '../store';

export default defineComponent({
  setup() {
    const store = useStore(Store);
    const subtract = () => store.count--;
    const add = () => store.count++;

    return {
      store,
      add,
      subtract,
    };
  },
});
</script>
```

**JavaScript**

There's more info about this one in the [`subsribe` section](#Subscribe)! 🙃

```js
import { $ } from '@exo-store/core';
import store from '../store';
const { subscribe } = store[$];

const subtract = () => store.count--;
const add = () => store.count++;

document.querySelector('button#add').addEventListener('click', add);
document.querySelector('button#subtract').addEventListener('click', subtract);
subscribe(() => {
  document.querySelector('div#count').innerHTML = `${store.count}`;
});
```

## Reactivity

Stores are fully reactive, even when destructuring or using a [selector](#selectors). However, because primitive (non-object) values in JavaScript are updated by assignment rather than reference, we must use a special `set` helper for primitives.

```tsx
import { useStore, set } from '@exo-store/preact';
import Store from '../store';

const Component = () => {
  // Because we've selected just `count` (a number), assigning a new value
  // won't update the store. We should use the `set` helper instead!
  const count = useStore(Store, s => s.count);
  const subtract = () => set(count, value => value -= 1);
  const add = () => set(count, value => value += 1);

  return (
    <div>
      <button onClick={subtract}>-</button>
      <div>{count}</div>
      <button onClick={add}>+</button>
    </div>
  );
};
```

Here is the signature of `set`.

```ts
/** Update a primitive value (from a store) in a reactive manner */
function set<T extends string|number|boolean>(value: T, newValue: T): void;
function set<T extends string|number|boolean>(value: T, setter: (currentValue: T) => T): void;
```

## Utilities

Stores also have some common utilities exposed under a `$` property.

> `$` is a Symbol which is exported from `@exo-store/core`, but your IDE probably imports it automatically.

#### Computed Values

You can `compute` store values automatically.

```ts
import { createStore, $ } from '@exo-store/core';

// Define the default value of `store.double`
const store = createStore({ count: 0, double: 0 });
const { compute } = store[$];

// Then assign `store.double` to a computed value
store.double = compute((s) => s.count * 2);
```

#### Subscribe

You can manually `subscribe` to all store changes from anywhere. Inside of framework components, `useStore` hooks do this for you automatically.

```ts
import { createStore, $ } from '@exo-store/core';

const store = createStore({ ... });
const { subscribe } = store[$];

// Subscribe to all store updates
const unsubscribe = subscribe(s => {
    console.log('Store updated!', s);
});

// Later...
unsubscribe();
```

#### Selectors

You can **use a selector** to `subscribe` to a subset of changes from anywhere.

```ts
import { createStore, $ } from '@exo-store/core';

const store = createStore({
  some: { deeply: { nested: { slice: 0 } } },
});
const { subscribe } = store[$];

// Subscribe only when `store.some.deeply.nested.slice` updates
const unsubscribe = subscribe({
  select: (s) => s.some.deeply.nested.slice,
  onChange: (s) => {
    console.log('Store updated!', s);
  },
});

// Later...
unsubscribe();
```

Inside of framework components, the `useStore` hook accepts a **selector** as the second argument.

```ts
// This component will only rerender when the selected value changes!
const [state, store] = useStore(Store, (s) => s.some.deeply.nested.slice);
```
