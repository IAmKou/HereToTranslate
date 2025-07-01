import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import { authService } from './services/auth.service';

// PrimeVue
import PrimeVue from 'primevue/config';
import 'primevue/resources/primevue.min.css';
import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primeicons/primeicons.css';

import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

async function bootstrap() {
  try {
    await authService.getCurrentUser();
  } catch (e) {
    // It's fine if user is not logged in
  }

  const app = createApp(App);

  app.use(PrimeVue);
  app.use(ConfirmationService);
  app.use(ToastService);

  app.component('Card', Card);
  app.component('DataTable', DataTable);
  app.component('Column', Column);
  app.component('InputText', InputText);
  app.component('ConfirmDialog', ConfirmDialog);
  app.component('Toast', Toast);

  axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        router.push('/login');
      }
      return Promise.reject(error);
    }
  );

  app.use(router);
  app.mount('#root');
}

bootstrap(); // 🟢 Call the setup
