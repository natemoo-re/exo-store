interface StoreChange {
  path: string;
  oldValue?: any;
  newValue?: any;
}
interface OnChange<T extends Record<any, any>> {
  (state: T, change?: StoreChange): any;
}

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

function getPath(proxy: any) {
  if (typeof proxy === 'function') {
    proxy = proxy(createPathProxy());
  }
  return (proxy as any)[ProxyPath];
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
      if (typeof _value === 'function' && prop !== $subscribe) {
        return _value(root ? root : value);
      }
      if (typeof _value === 'object') {
        return createProxy(_value, cb, {
          path: [...path, prop],
          root: root ? root : value,
        });
      }
      return _value;
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

/** @internal */
export const $ = Symbol('$');
const $subscribe = Symbol('subscribe');
const $computed = Symbol('computed');

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
    const path = getPath(select(createPathProxy())).join('.');
    return (store as any)[$subscribe]((_state: T, ctx: StoreChange) => {
      if (ctx?.path?.indexOf(path) !== 0) return;
      onChange!(select(_state), ctx);
    });
  }
  return () => {};
}

// === PUBLIC API ===

export type Store<T extends Record<any, any>> = T & StoreMarker<T>;

export const freeze = (store: Store<any>) =>
  Object.freeze(JSON.parse(JSON.stringify(store)));

export function createStore<T extends Record<any, any>>(
  initialValue: T = {} as Record<any, any>,
): Store<T> {
  let value: T;
  const fns = new Set<OnChange<T>>();

  const emit = (ctx: StoreChange) => {
    for (const fn of fns.values()) {
      fn.apply(null, [value, ctx]);
    }
  };
  value = createProxy(initialValue, emit) as T;

  const _subscribe = (fn: OnChange<T>) => {
    fns.add(fn);
    return () => {
      fns.delete(fn);
    };
  };

  const handlers = {
    subscribe: (arg: any) => subscribe(value as any, arg),
    compute: (i: any) => i,
  };

  Object.defineProperty(value, $subscribe, {
    writable: false,
    value: _subscribe,
  });

  Object.defineProperty(value, $computed, {
    writable: false,
    value: new Map(),
  });

  Object.defineProperty(value, $, {
    value: handlers,
  });

  return value as Store<T>;
}
