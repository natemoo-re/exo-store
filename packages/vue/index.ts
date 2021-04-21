import { onUnmounted, ref, getCurrentInstance, isRef, Ref } from 'vue';
import { $, Store, WithoutStoreMarker } from '@exo-store/core';
export { set } from '@exo-store/core';

const autoUnref = (value: Ref<any>) => {
  return new Proxy(value, {
    get(target, prop, receiver) {
      let _value = Reflect.get(target, prop, receiver);
      if (typeof _value === 'undefined' && isRef(target)) {
        _value = Reflect.get((target as Ref<any>).value, prop, receiver);
      }
      return _value;
    }
  })
}

export function useStore<T extends Store<any>>(
  store: T,
): WithoutStoreMarker<T>;
export function useStore<
  T extends Store<any>,
  Selector extends (value: WithoutStoreMarker<T>) => any
>(
  store: T,
  select: Selector,
): ReturnType<Selector>;
export function useStore<
  T extends Store<any>,
  Selector extends (value: WithoutStoreMarker<T>) => any
>(
  store: T,
  select?: Selector,
) {
  const instance = getCurrentInstance();
  let value = autoUnref(ref(select ? select(store) : store));

  const onChange = (v: typeof value) => {
    if (isRef(value)) value.value = v;
    else value = v;
    instance?.update();
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

  return value;
}
