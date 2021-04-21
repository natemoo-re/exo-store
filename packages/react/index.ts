import { useState, useEffect } from 'react';
import { $, Store, WithoutStoreMarker } from '@exo-store/core';
export { set } from '@exo-store/core';

export function useStore<T extends Store<any>>(
  store: T,
): WithoutStoreMarker<T>;
export function useStore<
  T extends Store<any>,
  Selector extends (value: WithoutStoreMarker<T>) => any
>(
  store: T,
  selector: Selector,
): ReturnType<Selector>;
export function useStore<
  T extends Store<any>,
  Selector extends (value: WithoutStoreMarker<T>) => any
>(store: T, select?: Selector) {
  let value = select ? select(store) : store;
  const [_, forceUpdate] = useState({});

  const onChange = (v: typeof value) => {
    value = v;
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
  }, []);

  return value;
}
