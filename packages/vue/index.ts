import { onUnmounted, ref } from 'vue';
import { $, freeze, Store, WithoutStoreMarker } from '@exo-store/core';

export function useStore<T extends Store<any>>(
  store: T,
): [Readonly<WithoutStoreMarker<T>>, WithoutStoreMarker<T>];
export function useStore<
  T extends Store<any>,
  Selector extends (value: WithoutStoreMarker<T>) => any
>(
  store: T,
  select: Selector,
): [Readonly<ReturnType<Selector>>, WithoutStoreMarker<T>];
export function useStore<
  T extends Store<any>,
  Selector extends (value: WithoutStoreMarker<T>) => any
>(
  store: T,
  select?: Selector,
): [Readonly<WithoutStoreMarker<T>>, WithoutStoreMarker<T>] {
  let value = ref(select ? select(store) : store);

  const onChange = (v: typeof value) => {
    value.value = freeze(v);
  };

  let unsubscribe = () => {};
  if (typeof select === 'function') {
    unsubscribe = (store as Store<any>)[$].subscribe({
      select,
      onChange,
    });
  } else {
    unsubscribe = (store as Store<any>)[$].subscribe(onChange);
  }

  onUnmounted(unsubscribe);

  return [value, store];
}
