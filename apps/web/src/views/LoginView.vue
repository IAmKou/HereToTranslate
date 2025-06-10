<template>
  <div class="login-form">
    <h2>Login</h2>
    <form @submit.prevent="login">
      <InputText
        v-model="username"
        placeholder="Username"
        required
      />
      <Password
        v-model="password"
        placeholder="Password"
        toggleMask
        feedback="false"
        required
      />
      <Button
        type="submit"
        label="Login"
        class="p-button-primary"
        style="width:100%;margin-bottom:1rem"
      />
      <p v-if="error" style="color:red">{{ error }}</p>
    </form>
    <div style="margin-top: 20px; text-align: center">
      <p>Or sign in with</p>
      <div id="g_id_onload"></div>
      <div id="g_id_signin"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth.service'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const username = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()

const login = async () => {
  try {
    await authService.login({
      username: username.value,
      password: password.value,
    })
    const user = authService.getUser()
    if (user?.role === 'admin') {
      await router.push('/adminhome')
    } else {
      await router.push('/userhome')
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Login failed.'
  }
}

onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.onload = () => {
    window.google.accounts.id.initialize({
      client_id: '580928535531-jmj6kfgfr6madkfbb7btjlb85h1sastj.apps.googleusercontent.com',
      callback: handleGoogleSignIn
    })
    window.google.accounts.id.renderButton(
      document.getElementById('g_id_signin'),
      {
        type: 'standard',
        size: 'large',
        theme: 'outline',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      }
    )
  }
  document.head.appendChild(script)
})

const handleGoogleSignIn = async (response) => {
  try {
    await authService.loginWithGoogle(response.credential)
    const user = authService.getUser()
    if (user?.role === 'admin') {
      await router.push('/adminhome')
    } else {
      await router.push('/userhome')
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Google sign-in failed.'
  }
}
</script>

<style>
.login-form {
  width: 320px;
  margin: auto;
  padding: 2rem;
  border: 1px solid #ccc;
  border-radius: 1rem;
  background: #fff;
}
.login-form .p-inputtext,
.login-form .p-password {
  width: 100%;
  margin-bottom: 1rem;
  box-sizing: border-box;
}
</style>
