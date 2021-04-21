import { FunctionalComponent, h, Fragment } from 'preact';
import { memo } from 'preact/compat';
import { set } from '@exo-store/core';
import { useStore } from '@exo-store/preact';
import MyStore from '../store';
import { useEffect, useRef } from 'preact/hooks';

const useFlash = (value: any) => {
  const el = useRef<any>();
  useEffect(() => {
    const div = el.current;
    if (!div) return;
    div.classList.add('flash');
    setTimeout(() => {
      div.classList.remove('flash');
    }, 500);
  }, [el, value])
  return el;
}

const Selected = memo(() => {
  const count = useStore(MyStore, v => v.deeply.nested.value);
  const el = useFlash(count);
  return <pre class="value" ref={el} dangerouslySetInnerHTML={{ __html: `{ deeply: { nested: { value: ${count} }}}` }} />
});

const App: FunctionalComponent = () => {
  const count = useStore(MyStore, v => v.preact);
  const add = () => set(count, v => v + 1);
  const el = useFlash(count);

  return (
    <>
      <h3>Hello from Preact!</h3>
      <pre ref={el} class="value" dangerouslySetInnerHTML={{ __html: 'preact: ' + count }} />

      <Selected />

      <button onClick={add}>+</button>
    </>
  );
};

export default App;
