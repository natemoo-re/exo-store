import { createApp } from 'vue';
// @ts-ignore
import App from '../components/App.vue';

export default () => {
  const app = createApp(App);
  app.mount(document.querySelector('#vue')!);
};
