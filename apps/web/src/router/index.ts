import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import { authService } from '../services/auth.service';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/adminhome',
      name: 'adminhome',
      component: () => import('../views/AdminHomeView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }},
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignUpView.vue'),
    },
    {
      path: '/rate',
      name: 'rate',
      component: () => import('../views/RateView.vue'),
    },
    {
      path: '/userhome',
      name: 'userhome',
      component: () => import('../views/UserHomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/forgot-password',
      name: 'forgotpassword',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/rate',
      name: 'rate',
      component: () => import('../views/RateView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/createrequest',
      name: 'createrequest',
      component: () => import('../views/CreateRequestView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/request',
      name: 'request',
      component: () => import('../views/RequestListView.vue'),
      meta: { requiresAuth: false }
    }
  ],

});

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();

  if (requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (requiresAdmin && !isAdmin) {
    next('/userhome');
  } else if (to.path === '/login' && isAuthenticated) {
    next(isAdmin ? '/adminhome' : '/userhome');
  } else {
    next();
  }
});

export default router;
