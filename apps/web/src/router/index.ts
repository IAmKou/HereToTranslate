import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import { authService } from '../services/auth.service';
import AdminUserManagement from '../views/AdminUserManagement.vue';


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
      path: '/forgot-password',
      name: 'forgotpassword',
      component: () => import('../views/ForgotPasswordView.vue'),
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
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatListView.vue'),
      meta: { requiresAuth: true},
      children: [
        {
          path: ':id',
          name: 'chat-room',
          component: () => import('../views/ChatRoomView.vue'),
        },
      ],
    },
  ],
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();
  const isSuperAdmin = authService.isSuperAdmin();

  if (requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (requiresAdmin && !isAdmin) {
    next('/userhome');
  } else if (to.path === '/login' && isAuthenticated) {
    next(isSuperAdmin ? '/adminhome' : isAdmin ? '/adminhome' : '/userhome');
  } else {
    next();
  }
});

export default router;
