import { h, render } from 'preact';
import App from '../components/App.preact';

export default () => {
  render(h(App, {}), document.querySelector('#preact')!);
};
