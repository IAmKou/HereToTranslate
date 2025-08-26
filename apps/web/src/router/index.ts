import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import { authService } from '../services/auth.service';
import AdminUserManagement from '../views/AdminUserManagement.vue';
import AdminWithdrawals from '../views/AdminWithdrawals.vue';
import AdminNotificationView from '../views/AdminNotificationView.vue';
import OauthCallback from '../components/OauthCallback.vue';


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
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/review',
      name: 'admin-review',
      component: () => import('../views/AdminReviewView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/review/:id',
      name: 'admin-review-detail',
      component: () => import('../views/AdminReviewDetailView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/deadline-checker',
      name: 'deadline-checker',
      component: () => import('../components/DeadlineCheckerUI.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/notifications',
      name: 'admin-notifications',
      component: AdminNotificationView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true
      },
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
      path: '/paypal-final-success',
      name: 'paypal-final-success',
      component: () => import('../views/PayPalFinalSuccessView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/paypal-final-cancel',
      name: 'paypal-final-cancel',
      component: () => import('../views/PayPalFinalCancelView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/oauth-callback',
      name: 'oauth-callback',
      component: OauthCallback,
      meta: { requiresAuth: false }
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
    },
    {
      path: '/notifications',
      name: 'user-notifications',
      component: () => import('../views/UserNotificationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notifications/:id',
      name: 'notification-detail',
      component: () => import('../views/NotificationDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/project-invitations',
      name: 'project-invitations',
      component: () => import('../views/ProjectInvitationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:projectId/branches/:branchId/translate',
      name: 'translation-editor',
      component: () => import('../views/TranslationEditorView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/projects/:projectId/branches/:branchId/handover',
      name: 'translation-handover',
      component: () => import('../views/TranslationHandoverView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/requests/:requestId/handover',
      name: 'request-handover',
      component: () => import('../views/TranslationHandoverView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/settings',
      name: 'admin-settings',
      component: () => import('../components/AdminSetting.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    }

  ],
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();
  const currentUser = authService.getUser();

  console.log('🔍 Router Guard - Navigation from:', from.path, 'to:', to.path);
  console.log('🔍 Router Guard - Requires auth:', requiresAuth);
  console.log('🔍 Router Guard - Requires admin:', requiresAdmin);
  console.log('🔍 Router Guard - Is authenticated:', isAuthenticated);
  console.log('🔍 Router Guard - Is admin:', isAdmin);
  console.log('🔍 Router Guard - Current user:', currentUser);

  // If user is already on login page and authenticated, redirect to appropriate home
  if (to.path === '/login' && isAuthenticated) {
    if (isAdmin) {
      console.log('🔍 Router Guard - Authenticated admin on login page, redirecting to adminhome');
      next('/adminhome');
    } else {
      console.log('🔍 Router Guard - Authenticated user on login page, redirecting to userhome');
      next('/userhome');
    }
    return;
  }

  // Allow access to login page even if not authenticated
  if (to.path === '/login') {
    console.log('🔍 Router Guard - Allowing access to login page');
    next();
    return;
  }

  // Allow access to home page even if not authenticated (public page)
  if (to.path === '/') {
    console.log('🔍 Router Guard - Allowing access to home page');
    next();
    return;
  }

  // Allow access to register page even if not authenticated
  if (to.path === '/register') {
    console.log('🔍 Router Guard - Allowing access to register page');
    next();
    return;
  }

  // Allow access to forgot password page even if not authenticated
  if (to.path === '/forgot-password') {
    console.log('🔍 Router Guard - Allowing access to forgot password page');
    next();
    return;
  }

  // Allow access to oauth callback page even if not authenticated
  if (to.path === '/oauth-callback') {
    console.log('🔍 Router Guard - Allowing access to oauth callback page');
    next();
    return;
  }

  // Allow access to public pages even if not authenticated
  if (to.path === '/all-requests') {
    console.log('🔍 Router Guard - Allowing access to public requests page');
    next();
    return;
  }

  // Allow access to paypal success page even if not authenticated
  if (to.path === '/paypal-success') {
    console.log('🔍 Router Guard - Allowing access to paypal success page');
    next();
    return;
  }

  if (requiresAuth && !isAuthenticated) {
    console.log('🔍 Router Guard - Redirecting to / (not authenticated)');
    next('/');
  } else if (requiresAdmin && !isAdmin) {
    console.log('🔍 Router Guard - Redirecting to /userhome (not admin)');
    next('/userhome');
  } else {
    console.log('🔍 Router Guard - Allowing navigation to:', to.path);
    next();
  }
});

export default router;
