<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/auth.service';

const router = useRouter();

onMounted(async () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');

  if (idToken || accessToken) {
    try {
      await authService.loginWithGoogle(idToken || accessToken);
      const user = authService.getUser();
      if (user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN') {
        await router.push('/adminhome');
      } else {
        await router.push('/userhome');
      }
    } catch (err) {
      console.error('Login failed', err);
      await router.push('/login');
    }
  } else {
    await router.push('/login');
  }
});
</script>

<template>
  <div>Processing Google sign-in...</div>
</template>
