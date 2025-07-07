import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService, type User } from '../services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  const isAdmin = computed(() => {
    const id = user.value?.role?.id
    return id === 1 || id === 2
  })

  const login = async (credentials: { username: string; password: string }) => {
    loading.value = true
    try {
      const response = await authService.login(credentials)
      user.value = response.user
      return response
    } finally {
      loading.value = false
    }
  }

  const register = async (data: {
    username: string
    password: string
    email: string
    phone: string
    fullName: string
  }) => {
    loading.value = true
    try {
      const response = await authService.register(data)
      return response
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await authService.logout()
      user.value = null
    } finally {
      loading.value = false
    }
  }

  const getCurrentUser = async () => {
    loading.value = true
    try {
      const currentUser = await authService.getCurrentUser()
      user.value = currentUser
      return currentUser
    } finally {
      loading.value = false
    }
  }

  const refreshTokens = async () => {
    try {
      const response = await authService.refreshTokens()
      user.value = response.user
      return response
    } catch (error) {
      user.value = null
      throw error
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
    getCurrentUser,
    refreshTokens
  }
})
