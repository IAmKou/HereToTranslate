<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import AppFooter from '../components/AppFooter.vue';

const router = useRouter();

const navigateToJoin = () => {
  router.push('/register');
};

const features = ref([
  {
    icon: 'pi pi-bolt',
    title: 'Fast & Efficient',
    description: 'Get high-quality translations delivered in the shortest time possible',
    color: '#3B82F6'
  },
  {
    icon: 'pi pi-users',
    title: 'Trusted Team',
    description: 'Work with verified and experienced translators',
    color: '#10B981'
  },
  {
    icon: 'pi pi-globe',
    title: 'Multi-language Support',
    description: 'Translate in over 50+ different languages worldwide',
    color: '#8B5CF6'
  },
  {
    icon: 'pi pi-shield',
    title: 'Quality Assured',
    description: 'All translations are reviewed and quality guaranteed',
    color: '#F59E0B'
  }
]);

const supportedLanguages = ref([
  'Vietnamese', 'English', 'Chinese', 'Japanese', 'Korean', 'Thai',
  'French', 'German', 'Spanish', 'Italian', 'Russian', 'Arabic'
]);
</script>

<template>
  <div class="app-layout">
    <Navbar />
    <div class="main-content">
      <main class="landing-page">
        <!-- Hero Section -->
        <section class="hero-section">
          <div class="hero-background">
            <div class="hero-shapes">
              <div class="shape shape-1"></div>
              <div class="shape shape-2"></div>
              <div class="shape shape-3"></div>
            </div>
          </div>
          <div class="hero-content">
            <div class="hero-text">
              <div class="hero-badge">
                <i class="pi pi-star-fill"></i>
                <span>Trusted by 10,000+ users worldwide</span>
              </div>
              <h1 class="hero-title">
                Professional Translation.
                <span class="gradient-text">Simplified.</span>
              </h1>
              <p class="hero-subtitle">
                Join our community of verified translators and start earning by helping people communicate across languages.
                Experience professional translation opportunities.
              </p>
              <div class="hero-buttons">
                <Button
                  label="Join as Translator"
                  icon="pi pi-user-plus"
                  class="p-button-primary p-button-lg hero-btn-primary"
                  @click="navigateToJoin"
                />
              </div>
              <div class="hero-stats">
                <div class="stat-item">
                  <div class="stat-number">50+</div>
                  <div class="stat-label">Languages</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">1000+</div>
                  <div class="stat-label">Translators</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">24h</div>
                  <div class="stat-label">Delivery</div>
                </div>
              </div>
            </div>
            <div class="hero-illustration">
              <div class="illustration-container">
                <div class="floating-card card-1">
                  <i class="pi pi-file-edit"></i>
                  <span>Document Translation</span>
                </div>
                <div class="floating-card card-2">
                  <i class="pi pi-comments"></i>
                  <span>Live Chat</span>
                </div>
                <div class="floating-card card-3">
                  <i class="pi pi-check-circle"></i>
                  <span>Quality Check</span>
                </div>
                <div class="main-illustration">
                  <i class="pi pi-globe" style="font-size: 8rem; color: #ffffff;"></i>
                  <div class="pulse-ring"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- How It Works Section -->
        <section class="how-it-works">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">How It Works</h2>
              <p class="section-subtitle">3 simple steps to get quality translations</p>
            </div>

            <div class="steps-grid">
              <Card class="step-card" v-for="(step, index) in [
                {
                  title: 'Submit Request',
                  description: 'Upload your documents and specify translation requirements, target language, and completion deadline.',
                  icon: 'pi pi-upload'
                },
                {
                  title: 'Match Translators',
                  description: 'Our system matches you with qualified translators who specialize in your content type and language pair.',
                  icon: 'pi pi-users'
                },
                {
                  title: 'Receive Translation',
                  description: 'Get your professionally translated content delivered on time with quality assurance and revision options.',
                  icon: 'pi pi-check-circle'
                }
              ]" :key="index">
                <template #header>
                  <div class="step-number">{{ index + 1 }}</div>
                </template>
                <template #title>
                  <h3>{{ step.title }}</h3>
                </template>
                <template #content>
                  <div class="step-content">
                    <i :class="step.icon" class="step-icon"></i>
                    <p>{{ step.description }}</p>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </section>

        <!-- Features Section -->
        <section class="features-section">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">Why Choose Us</h2>
              <p class="section-subtitle">Discover the benefits of our translation platform</p>
            </div>

            <div class="features-grid">
              <Card v-for="feature in features" :key="feature.title" class="feature-card">
                <template #content>
                  <div class="feature-content">
                    <div class="feature-icon-wrapper" :style="{ backgroundColor: feature.color + '20' }">
                      <i :class="feature.icon" class="feature-icon" :style="{ color: feature.color }"></i>
                    </div>
                    <h3>{{ feature.title }}</h3>
                    <p>{{ feature.description }}</p>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </section>

        <!-- Supported Languages Section -->
        <section class="languages-section">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">Supported Languages</h2>
              <p class="section-subtitle">We support translation in over 50+ languages</p>
            </div>

            <div class="languages-grid">
              <div v-for="language in supportedLanguages" :key="language" class="language-tag">
                {{ language }}
              </div>
            </div>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section">
          <div class="container">
            <Card class="cta-card">
              <template #content>
                <div class="cta-content">
                  <div class="cta-text">
                    <h2>Ready to Start Translating?</h2>
                    <p>Join thousands of professional translators in our community</p>
                  </div>
                  <div class="cta-buttons">
                    <Button
                      label="Become a Translator"
                      icon="pi pi-user-plus"
                      class="p-button-primary p-button-lg"
                      @click="navigateToJoin"
                    />
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 56px);
}

.landing-page {
  flex: 1;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 120px 0 100px;
  min-height: 90vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.hero-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 100px;
  height: 100px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.shape-3 {
  width: 80px;
  height: 80px;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  position: relative;
  z-index: 2;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

.hero-badge i {
  color: #FFD700;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 24px;
  line-height: 1.1;
}

.gradient-text {
  background: linear-gradient(45deg, #FFD700, #FFA500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.3rem;
  margin-bottom: 40px;
  line-height: 1.6;
  opacity: 0.95;
  max-width: 500px;
}

.hero-buttons {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 60px;
  justify-content: flex-start;
}

.hero-btn-primary {
  background: linear-gradient(45deg, #FFD700, #FFA500) !important;
  border: none !important;
  color: #1a1a1a !important;
  font-weight: 600 !important;
  padding: 16px 32px !important;
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}

.hero-btn-primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 10px 25px rgba(255, 215, 0, 0.3) !important;
}

.hero-btn-secondary {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 2px solid rgba(255, 255, 255, 0.3) !important;
  color: white !important;
  font-weight: 600 !important;
  padding: 16px 32px !important;
  border-radius: 12px !important;
  backdrop-filter: blur(10px) !important;
  transition: all 0.3s ease !important;
}

.hero-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  transform: translateY(-2px) !important;
}

.hero-stats {
  display: flex;
  gap: 40px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #FFD700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.hero-illustration {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.illustration-container {
  position: relative;
  width: 400px;
  height: 400px;
}

.main-illustration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0;
  }
}

.floating-card {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  animation: float 4s ease-in-out infinite;
}

.card-1 {
  top: 10%;
  left: 0;
  animation-delay: 0s;
}

.card-2 {
  top: 60%;
  right: 0;
  animation-delay: 1s;
}

.card-3 {
  bottom: 20%;
  left: 10%;
  animation-delay: 2s;
}

/* Section Styles */
.section-header {
  text-align: center;
  margin-bottom: 80px;
}

.section-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: #1a1a1a;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  border-radius: 2px;
}

.section-subtitle {
  font-size: 1.2rem;
  color: #666;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* How It Works Section */
.how-it-works {
  padding: 120px 0;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 40px;
  margin-top: 60px;
}

.step-card {
  text-align: center;
  border: none;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  transition: all 0.3s ease;
  background: white;
  overflow: hidden;
}

.step-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.step-number {
  width: 80px;
  height: 80px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  margin: 0 auto 24px;
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.step-content {
  padding: 0 24px 32px;
}

.step-icon {
  font-size: 2.5rem;
  color: #667eea;
  margin-bottom: 16px;
}

.step-content h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.step-content p {
  color: #666;
  line-height: 1.6;
  font-size: 1rem;
}

/* Features Section */
.features-section {
  padding: 120px 0;
  background: white;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px;
  margin-top: 60px;
}

.feature-card {
  text-align: center;
  border: none;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  transition: all 0.3s ease;
  background: white;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.feature-content {
  padding: 40px 24px;
}

.feature-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  transition: all 0.3s ease;
}

.feature-card:hover .feature-icon-wrapper {
  transform: scale(1.1);
}

.feature-icon {
  font-size: 2.5rem;
}

.feature-content h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.feature-content p {
  color: #666;
  line-height: 1.6;
  font-size: 1rem;
}

/* Languages Section */
.languages-section {
  padding: 120px 0;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.languages-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  margin-top: 60px;
}

.language-tag {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.language-tag:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

/* CTA Section */
.cta-section {
  padding: 120px 0;
  background: white;
}

.cta-card {
  border: none;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 24px;
  overflow: hidden;
}

.cta-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 60px;
  gap: 40px;
}

.cta-text h2 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 16px;
}

.cta-text p {
  font-size: 1.2rem;
  opacity: 0.9;
  margin-bottom: 0;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }

  .hero-buttons {
    justify-content: center;
  }

  .hero-stats {
    justify-content: center;
  }

  .section-title {
    font-size: 2.5rem;
  }

  .steps-grid,
  .features-grid {
    grid-template-columns: 1fr;
  }

  .cta-content {
    flex-direction: column;
    text-align: center;
    padding: 40px;
  }

  .cta-text h2 {
    font-size: 2.5rem;
  }

  .cta-buttons {
    justify-content: center;
  }

  .hero-buttons {
    justify-content: center;
  }

  .illustration-container {
    width: 300px;
    height: 300px;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .container {
    padding: 0 16px;
  }

  .hero-content {
    padding: 0 16px;
  }

  .hero-stats {
    flex-direction: column;
    gap: 20px;
  }

  .cta-content {
    padding: 30px 20px;
  }

  .cta-text h2 {
    font-size: 2rem;
  }
}
</style>
