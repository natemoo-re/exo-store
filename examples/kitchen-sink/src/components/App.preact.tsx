import { FunctionalComponent, h } from 'preact';
import { useStore } from '@exo-store/preact';
import MyStore from '../store';

const App: FunctionalComponent = () => {
  const [state, store] = useStore(MyStore, (v) => v.preact);
  const add = () => store.preact++;

  return (
    <div>
      <h3>Hello from Preact!</h3>
      <pre>{JSON.stringify(state, null, 2)}</pre>

      <button onClick={add}>+</button>
    </div>
  );
};

export default App;
