import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import { authService } from './services/auth.service';
import { createPinia } from 'pinia';

// PrimeVue
import PrimeVue from 'primevue/config';
import 'primevue/resources/primevue.min.css';
import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primeicons/primeicons.css';


import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import Menu from 'primevue/menu';
import Dialog from 'primevue/dialog';

import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

async function bootstrap() {
  try {
    await authService.getCurrentUser();
  } catch (e) {
    //sdad
  }

  const app = createApp(App);

  // Thêm Pinia
  const pinia = createPinia();
  app.use(pinia);

  app.use(PrimeVue);
  app.use(ConfirmationService);
  app.use(ToastService);

  app.component('Button', Button);
  app.component('Card', Card);
  app.component('DataTable', DataTable);
  app.component('Column', Column);
  app.component('InputText', InputText);
  app.component('ConfirmDialog', ConfirmDialog);
  app.component('Toast', Toast);
  app.component('Menu', Menu);
  app.component('Dialog', Dialog);

  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401 && router.currentRoute.value.path !== '/login') {
        console.log('🔍 Axios Interceptor - 401 error, redirecting to /');
        router.push('/');
      }
      return Promise.reject(error);
    }
  );

  app.use(router);
  app.mount('#root');
}

bootstrap();
