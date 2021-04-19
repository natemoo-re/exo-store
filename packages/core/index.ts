import { dset } from 'dset';

interface StoreChange {
  path: string;
  oldValue?: any;
  newValue?: any;
}
interface OnChange<T extends Record<any, any>> {
  (state: T, change?: StoreChange): any;
}

type Await<T> = T extends PromiseLike<infer U> ? U : T;

const ProxyPath = Symbol('ProxyPath');
function createPathProxy(path: PropertyKey[] = []): any {
  const proxy = new Proxy(
    { [ProxyPath]: path },
    {
      get(target, key: string | number | symbol) {
        if (key === ProxyPath) {
          return target[ProxyPath];
        }
        if (typeof key === 'string') {
          const intKey = parseInt(key, 10);
          if (key === intKey.toString()) {
            key = intKey;
          }
        }
        return createPathProxy([...(path || []), key]);
      },
    },
  );
  return proxy;
}

/** @internal */
export function _getPath(proxy: any) {
  if (typeof proxy === 'function') {
    proxy = proxy(createPathProxy());
  }
  return (proxy as any)[ProxyPath];
}

export const set = <T extends string|number|boolean>(target: T, value: T|((currentValue:T) => T)) => {
  if (target == null) throw new Error(`Unable to set value of "${target}"`);
  if (target && !(target as any)[$set]) throw new Error('Unable to set variables which were not created with createStore()')

  return (target as any)[$set](value);
}

const createProxy = <
  Value extends Record<any, T extends Function ? (store: Value) => any : T>,
  T extends any
>(
  value: Value,
  cb: (...args: any) => any,
  {
    path = [],
    root,
  }: { path?: (string | number | symbol)[]; root?: Value } = {},
) => {
  const handler: ProxyHandler<Value> = {
    get: (target, prop, receiver) => {
      if (((root ? root : value) as any)[$computed].has(prop)) {
        return ((root ? root : value) as any)[$computed].get(prop)(
          root ? root : value,
        );
      }
      if (prop === $) {
        return Reflect.get(root ? root : value, $, receiver);
      }
      if (prop === ProxyPath) {
        return [...path, prop].join('.');
      }
      let _value = Reflect.get(target, prop, receiver);
      if (typeof _value === 'function') {
        if (_value[$computed]) return _value(root ? root : value);
        return _value;
      }
      if (typeof _value === 'object') {
        return createProxy(_value, cb, {
          path: [...path, prop],
          root: root ? root : value,
        });
      }

      if (_value == null) return _value;

      if (_value[$set]) return _value;

      return Object.assign(_value, {
        [$set]: (newValue: any) => {
          const oldValue = _value;
          if (typeof newValue === 'function') newValue = newValue(oldValue);
          if (newValue === oldValue) return;
          Reflect.set(target, prop, newValue);
          cb({
            path: [...path, `${prop as string}`].join('.'),
            oldValue,
            newValue,
          });
        }
      });
    },
    set: (target, prop, value, receiver) => {
      const oldValue = Reflect.get(target, prop, receiver);
      if (value === oldValue) return true;
      const success = Reflect.set(target, prop, value, receiver);
      cb({
        path: [...path, `${prop as string}`].join('.'),
        oldValue,
        newValue: value,
      });
      return success;
    },
  };

  return new Proxy(value, handler);
};

const createReadyPromise = () => {
  const cbs = new Set<() => void>();
  return {
    subscribe: (cb: () => void) => {
      cbs.add(cb);
    },
    resolve: () => {
      for (const cb of cbs.values()) {
        cb();
        cbs.delete(cb);
      }
    }
  }
}

/** @internal */
export const $ = Symbol('$');
const $subscribe = Symbol('subscribe');
const $computed = Symbol('computed');
const $set = Symbol('set');

type Selector<T extends Record<any, any>> = (store: T) => any;
type Subscribe<T extends Record<any, any>> = {
  (onChange: OnChange<T>): () => void;
  (
    onChangeOrDescriptor?:
      | OnChange<T>
      | {
          select: Selector<T>;
          onChange: (
            value: ReturnType<Selector<T>> | undefined,
            change: StoreChange,
          ) => void;
        },
  ): () => void;
};
/** @internal */
export type StoreMarker<T extends Record<any, any>> = {
  [$]: {
    ready: () => Promise<void>;
    subscribe: Subscribe<T>;
    compute: (fn: (store: T) => any) => ReturnType<typeof fn>;
  };
};
/** @internal */
export type WithoutStoreMarker<T> = Omit<T, typeof $>;

/** @internal */
function subscribe<T extends Record<any, any> & StoreMarker<T>>(
  store: T,
  onChange: OnChange<T>,
): () => void;
/** @internal */
function subscribe<
  T extends Record<any, any> & StoreMarker<T>,
  Selector extends (value: T) => any
>(
  store: T,
  descriptor: {
    select: Selector;
    onChange: (
      value: ReturnType<Selector> | undefined,
      change: StoreChange,
    ) => void;
  },
): () => void;
/** @internal */
function subscribe<
  T extends Record<any, any> & StoreMarker<T>,
  Selector extends (value: T) => any
>(
  store: T,
  onChangeOrDescriptor?:
    | OnChange<T>
    | {
        select: Selector;
        onChange: (
          value: ReturnType<Selector> | undefined,
          change: StoreChange,
        ) => void;
      },
): () => void {
  if (typeof onChangeOrDescriptor === 'function') {
    return (store as any)[$subscribe](onChangeOrDescriptor);
  }
  if (typeof onChangeOrDescriptor === 'object') {
    const { select, onChange } = onChangeOrDescriptor;
    const path = _getPath(select).join('.');
    return (store as any)[$subscribe]((_state: T, ctx: StoreChange) => {
      if (ctx?.path?.indexOf(path) !== 0) return;
      onChange!(select(_state), ctx);
    });
  }
  return () => {};
}

// === PUBLIC API ===
export type Wrap<T> = T extends Record<any, any> ? T : { value: T };
export type Store<T extends Record<any, any>> = T & StoreMarker<T>;

export function createStore<Setup extends (...args: any) => any, T extends ReturnType<Setup>>(
  setup: Setup,
  fallback?: Await<T>
): Store<Await<T>>;
export function createStore<T extends Record<any, any>>(
  initialValue: T
): T;
export function createStore<T extends Record<any, any>>(
  initialValueOrSetup: T = {} as Record<any, any>,
  fallback?: T
): T {
  let value: T;
  const fns = new Set<OnChange<T>>();

  const emit = (ctx: StoreChange) => {
    for (const fn of fns.values()) {
      fn.apply(null, [value, ctx]);
    }
  };

  const _subscribe = (fn: OnChange<T>) => {
    fns.add(fn);
    return () => {
      fns.delete(fn);
    };
  };

  let isReady: ReturnType<typeof createReadyPromise>;
  const handlers = () => {
    isReady = createReadyPromise();
    return {
      subscribe: (arg: any) => subscribe(value as any, arg),
      compute: (i: any) => {
        return Object.assign(i, { [$computed]: true })
      },
      ready: () => new Promise<void>(resolve => isReady.subscribe(resolve))
    }
  };

  const intitialize = (initialValue: T) => {
    value = createProxy(initialValue, emit) as T;

    Object.defineProperty(value, $subscribe, {
      writable: false,
      value: _subscribe,
    });

    Object.defineProperty(value, $computed, {
      writable: false,
      value: new Map(),
    });

    Object.defineProperty(value, $, {
      value: handlers(),
    });

    return value as Store<T>;
  }

  if (typeof initialValueOrSetup !== 'function') {
    const value = intitialize(initialValueOrSetup);
    isReady!.resolve();
    return value;
  }

  const initialValueOrPromise = (initialValueOrSetup as any)();
  if (typeof initialValueOrPromise.then === 'undefined') {
    const value = intitialize(initialValueOrPromise as T);
    isReady!.resolve();
    return value;
  }

  if (typeof fallback === 'undefined') {
    throw new Error(`Please provide an initial fallback value to "createStore" when using an async setup function`)
  }

  const store = intitialize(fallback!);
  initialValueOrPromise.then((initialValue: T) => {
    for (const [key, value] of Object.entries(initialValue)) {
      store[key as keyof T] = value;
    }
  }).then(isReady!.resolve);
  
  return store;
}
