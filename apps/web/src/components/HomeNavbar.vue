<template>
  <nav class="home-navbar">
    <div class="nav-container">
      <div class="nav-brand">
        <router-link to="/" class="brand-link">
          <img src="../assets/logo-no-words.png" alt="HereToTranslate" class="brand-logo" />
          <span class="brand-text">Here to Translate</span>
        </router-link>
      </div>



      <div class="nav-center">
        <div class="nav-info">
          <span class="info-text">Professional Translation Services</span>
        </div>
      </div>

      <div class="nav-actions">
        <router-link to="/register" class="register-btn">
          Register
        </router-link>
        <router-link to="/login" class="signin-btn">
          Sign In
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const handleScroll = () => {
  const navbar = document.querySelector('.home-navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.home-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 0;
  transition: all 0.3s ease;
}

.home-navbar.scrolled {
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand {
  flex-shrink: 0;
}

.brand-link {
  text-decoration: none;
  color: #1a1a1a;
  display: flex;
  align-items: center;
}

.brand-logo {
  height: 45px;
  width: 45px;
  border-radius: 8px;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.brand-text {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-left: 0;
  transition: color 0.3s ease;
  line-height: 1;
  font-family: 'Inter', sans-serif;
}

.brand-link:hover .brand-logo {
  transform: scale(1.05);
}

.brand-link:hover .brand-text {
  color: #667eea;
}



.nav-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.nav-info {
  text-align: center;
}

.info-text {
  font-size: 1rem;
  font-weight: 500;
  color: #7B61FF;
  opacity: 0.8;
  font-family: 'Inter', sans-serif;
}

.nav-actions {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  align-items: center;
}

.register-btn {
  display: inline-block;
  background: transparent;
  color: #7B61FF;
  text-decoration: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s ease;
  border: 2px solid #7B61FF;
}

.register-btn:hover {
  background: #7B61FF;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(123, 97, 255, 0.3);
}

.signin-btn {
  display: inline-block;
  background: linear-gradient(45deg, #7B61FF, #8F6EFF);
  color: white;
  text-decoration: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(123, 97, 255, 0.3);
}

.signin-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(123, 97, 255, 0.4);
  color: white;
}

/* Responsive Design */
@media (max-width: 768px) {
  .nav-center {
    display: none;
  }

  .nav-container {
    justify-content: space-between;
  }

  .brand-text {
    display: none;
  }

  .brand-logo {
    height: 50px;
    width: 50px;
  }

  .register-btn,
  .signin-btn {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .nav-container {
    padding: 0 16px;
  }

  .brand-logo {
    height: 50px;
    width: 50px;
  }

  .nav-actions {
    gap: 8px;
  }

  .register-btn,
  .signin-btn {
    padding: 8px 16px;
    font-size: 0.85rem;
  }
}
</style>
