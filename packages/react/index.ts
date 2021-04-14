import { useState, useEffect } from 'react';
import { $, freeze, Store, WithoutStoreMarker } from '@exo-store/core';

export function useStore<T extends Store<any>>(
  store: T,
): [Readonly<WithoutStoreMarker<T>>, WithoutStoreMarker<T>];
export function useStore<
  T extends Store<any>,
  Selector extends (value: WithoutStoreMarker<T>) => any
>(
  store: T,
  selector: Selector,
): [Readonly<ReturnType<Selector>>, WithoutStoreMarker<T>];
export function useStore<
  T extends Store<any>,
  Selector extends (value: WithoutStoreMarker<T>) => any
>(store: T, select?: Selector) {
  let value = select ? select(store) : store;
  const [_, forceUpdate] = useState({});

  const onChange = (v: typeof value) => {
    value = freeze(v);
    forceUpdate({});
  };

  useEffect(() => {
    if (typeof select === 'function') {
      return (store as Store<any>)[$].subscribe({
        select,
        onChange,
      });
    }

    return (store as Store<any>)[$].subscribe(onChange);
  }, [store]);

  return [value, store];
}
