import '@fontsource-variable/inter';
import './style.css';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './app/router';
import { createQueryClient } from './queries/client';

createApp(App)
  .use(createPinia())
  .use(router)
  .use(VueQueryPlugin, { queryClient: createQueryClient() })
  .mount('#app');
