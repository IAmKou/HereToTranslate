import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import { authService } from '../services/auth.service';
import AdminUserManagement from '../views/AdminUserManagement.vue';
import AdminWithdrawals from '../views/AdminWithdrawals.vue';


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
      meta: { requiresAuth: false },
    },
    {
      path: '/adminhome',
      name: 'adminhome',
      component: () => import('../views/AdminHomeView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/userhome',
      name: 'userhome',
      component: () => import('../views/UserHomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/projects/create',
      name: 'create-project',
      component: () => import('../views/CreateProjectView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('../views/ProjectsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:projectId',
      name: 'project-detail',
      component: () => import('../views/ProjectDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:projectId/edit',
      name: 'project-edit',
      component: () => import('../views/ProjectEditView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:projectId/manage',
      name: 'project-manage',
      component: () => import('../views/ProjectManageView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/category',
      name: 'category',
      component: () => import('../views/CategoryList.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/userprofile',
      name: 'userprofile',
      component: () => import('../views/UserProfile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'AdminUserManagement',
      component: AdminUserManagement,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/admin/withdrawals',
      name: 'admin-withdrawals',
      component: AdminWithdrawals,
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { requiresAuth: false},
    },
    {
      path: '/requests/create',
      name: 'create-request',
      component: () => import('../views/CreateRequestView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:projectId/prole',
      name: 'prole',
      component: () => import('../views/ProjectRoleManagementView.vue'),
      meta: {requiresAuth: true},
    },
    {
      path: '/my-requests',
      name: 'my-requests',
      component: () => import('../views/MyRequestView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/all-requests',
      name: 'all-requests',
      component: () => import('../views/RequestPublicView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/requests/:requestId',
      name: 'request-detail',
      component: () => import('../views/RequestDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/requests/:requestId/registrants',
      name: 'request-registrants',
      component: () => import('../views/RequestRegistrantsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/paypal-success',
      name: 'paypal-success',
      component: () => import('../views/PaypalSuccessView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/oauth-callback',
      name: 'oauth-callback',
      component: () => import('../components/OauthCallback.vue'),
      meta: {requireAuth: false}
    },
    {
      path: '/wallet',
      name: 'wallet',
      component: () => import('../views/WalletView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/transactions',
      name: 'transaction-history',
      component: () => import('../views/TransactionHistoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/transactions',
      name: 'admin-transaction-history',
      component: () => import('../views/AdminTransactionHistoryView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/test',
      name: 'test',
      component: () => import('../views/TestView.vue'),
      meta: {requiresAuth: true},
    }

  ],
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();


  if (requiresAuth && !isAuthenticated) {
    next('/');
  } else if (requiresAdmin && !isAdmin) {
    next('/userhome');
  } else if (to.path === '/login' && isAuthenticated) {
    next(isAdmin ? '/adminhome' : '/userhome');
  } else {
    next();
  }
});

export default router;
