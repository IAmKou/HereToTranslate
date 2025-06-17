import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';


// PrimeVue
import PrimeVue from 'primevue/config';
import 'primevue/resources/primevue.min.css'; // core css
import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primeicons/primeicons.css'; // icons

// PrimeVue Components

import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

const app = createApp(App);

// Add PrimeVue
app.use(PrimeVue);
app.use(ConfirmationService);
app.use(ToastService);

// Register PrimeVue Components

app.component('Card', Card);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('InputText', InputText);
app.component('ConfirmDialog', ConfirmDialog);
app.component('Toast', Toast);


axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

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
