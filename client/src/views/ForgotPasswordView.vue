<template>
  <div class="auth-screen">
    <canvas ref="canvasRef" class="background-canvas"></canvas>
    
    <div class="scanlines"></div>
    <div class="vignette"></div>
    
    <div class="hud-corners">
      <div class="corner top-left"></div>
      <div class="corner top-right"></div>
      <div class="corner bottom-left"></div>
      <div class="corner bottom-right"></div>
    </div>

    <div class="utility-buttons-top">
      <button class="tech-button source-button" @click="openSourceCode">
        <span>SOURCE</span>
      </button>
      <button class="tech-button guide-button" @click="openGuide">
        <span>GUIDE</span>
      </button>
    </div>

    <div class="auth-wrapper">
      <router-link to="/signin" class="back-link">
        <span>← RETURN TO SIGNIN</span>
      </router-link>
      
      <div class="auth-container">
        <div class="title-bar"></div>
        <h1 class="glitch" data-text="PASSWORD RESET">PASSWORD RESET</h1>
        
        <div class="info-message">
          <span class="info-icon">🔒</span>
          <div class="info-text">
            <p>Enter your email address and we'll send you a reset code.</p>
          </div>
        </div>
        
        <form @submit.prevent="handleSubmit" class="auth-form">
          <div class="form-group">
            <label for="email">EMAIL ADDRESS</label>
            <div class="input-wrapper">
              <input 
                type="text" 
                id="email" 
                v-model="email" 
                required
                autocomplete="username"
              />
              <div class="input-glow"></div>
            </div>
          </div>

          <div v-if="error" class="error-message">
            <span class="error-icon">⚠</span> {{ error }}
          </div>

          <button type="submit" class="submit-button">
            <span class="button-text">SEND RESET CODE</span>
          </button>

          <router-link to="/signin" class="toggle-link">
            <span>REMEMBER PASSWORD? AUTHENTICATE</span>
          </router-link>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useRouter } from 'vue-router'

const gameStore = useGameStore()
const router = useRouter()
const email = ref('')
const error = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)

let animationFrame: number
let ctx: CanvasRenderingContext2D | null = null

class Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 0.5
    this.vy = (Math.random() - 0.5) * 0.5
    this.life = 1
  }
  
  update() {
    this.x += this.vx
    this.y += this.vy
    this.life -= 0.005
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = `rgba(0, 255, 255, ${this.life * 0.5})`
    ctx.beginPath()
    ctx.arc(this.x, this.y, 1, 0, Math.PI * 2)
    ctx.fill()
  }
}

const particles: Particle[] = []

function initCanvas() {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  if (!ctx) return
  
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  
  // Create initial particles
  for (let i = 0; i < 50; i++) {
    particles.push(new Particle(
      Math.random() * canvas.width,
      Math.random() * canvas.height
    ))
  }
}

function animate() {
  if (!ctx || !canvasRef.value) return
  
  const canvas = canvasRef.value
  ctx.fillStyle = 'rgba(10, 10, 30, 0.1)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update()
    particles[i].draw(ctx)
    
    if (particles[i].life <= 0) {
      particles.splice(i, 1)
      particles.push(new Particle(
        Math.random() * canvas.width,
        Math.random() * canvas.height
      ))
    }
  }
  
  // Draw connecting lines
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < 100) {
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.stroke()
      }
    }
  }
  
  animationFrame = requestAnimationFrame(animate)
}

function handleResize() {
  if (!canvasRef.value) return
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
}

// Store listener IDs
let resetCodeSentListenerId: string | null = null

const setupListeners = () => {
  removeListeners()
  
  resetCodeSentListenerId = gameStore.addEventListener('reset_code_sent', (data) => {
    // Store email and redirect to reset password page
    router.push({
      path: '/reset-password',
      query: {
        email: email.value,
        destination: data?.codeDeliveryDetails?.destination || email.value
      }
    })
    removeListeners()
  })
}

const removeListeners = () => {
  if (resetCodeSentListenerId) {
    gameStore.removeEventListener('reset_code_sent', resetCodeSentListenerId)
    resetCodeSentListenerId = null
  }
}

const openSourceCode = () => {
  window.open('https://github.com/kirodotdev/spirit-of-kiro/', '_blank')
}

const openGuide = () => {
  window.open('https://kiro.dev/docs/guides/learn-by-playing/', '_blank')
}

const handleSubmit = async () => {
  error.value = ''
  try {
    if (!gameStore.ws) {
      gameStore.reconnect()
      throw new Error('No WebSocket connection available. Attempting to reconnect...')
    }

    setupListeners()

    const message = {
      type: 'forgot_password',
      body: {
        username: email.value
      }
    }

    gameStore.ws.send(JSON.stringify(message))
  } catch (e: any) {
    error.value = e.message || 'An error occurred'
  }
}

let connectionListenerId: string | null = null
let reconnectFailedId: string | null = null

onMounted(() => {
  initCanvas()
  animate()
  
  connectionListenerId = gameStore.addEventListener('reconnect-attempt', (data) => {
    error.value = `Connection lost. Reconnecting... (${data.attempt}/${data.maxAttempts})`
  })
  
  reconnectFailedId = gameStore.addEventListener('reconnect-failed', () => {
    error.value = 'Failed to reconnect. Please try again later.'
  })
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  removeListeners()
  
  if (connectionListenerId) {
    gameStore.removeEventListener('reconnect-attempt', connectionListenerId)
  }
  
  if (reconnectFailedId) {
    gameStore.removeEventListener('reconnect-failed', reconnectFailedId)
  }
  
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.auth-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(ellipse at center, #0a0a1e 0%, #000000 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow: hidden;
  font-family: 'Courier New', monospace;
}

.background-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 2;
}

.vignette {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-shadow: inset 0 0 200px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  z-index: 2;
}

.hud-corners {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.corner {
  position: absolute;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(0, 255, 255, 0.5);
}

.corner.top-left {
  top: 20px;
  left: 20px;
  border-right: none;
  border-bottom: none;
}

.corner.top-right {
  top: 20px;
  right: 20px;
  border-left: none;
  border-bottom: none;
}

.corner.bottom-left {
  bottom: 20px;
  left: 20px;
  border-right: none;
  border-top: none;
}

.corner.bottom-right {
  bottom: 20px;
  right: 20px;
  border-left: none;
  border-top: none;
}

.utility-buttons-top {
  position: absolute;
  top: 30px;
  right: 90px;
  display: flex;
  gap: 1rem;
  z-index: 1001;
}

.tech-button {
  padding: 0.5rem 1.5rem;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  border: 1px solid rgba(0, 255, 255, 0.5);
  cursor: pointer;
  font-size: 0.7rem;
  letter-spacing: 0.2rem;
  font-family: 'Courier New', monospace;
  transition: all 0.3s;
  clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
}

.tech-button:hover {
  background: rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
}

.auth-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 450px;
  z-index: 10;
  padding: 2rem;
}

.back-link {
  color: #00ffff;
  text-decoration: none;
  font-size: 0.8rem;
  letter-spacing: 0.2rem;
  transition: all 0.3s;
  margin-bottom: 2rem;
  align-self: flex-start;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.05);
}

.back-link:hover {
  background: rgba(0, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.auth-container {
  background: rgba(0, 255, 255, 0.03);
  border: 1px solid rgba(0, 255, 255, 0.3);
  padding: 2.5rem;
  width: 100%;
  position: relative;
  clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);
  box-shadow: 
    0 0 30px rgba(0, 255, 255, 0.1),
    inset 0 0 30px rgba(0, 255, 255, 0.05);
}

.title-bar {
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00ffff, transparent);
  box-shadow: 0 0 10px #00ffff;
}

.glitch {
  color: #00ffff;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.8rem;
  letter-spacing: 0.3rem;
  text-shadow: 
    0 0 10px #00ffff,
    0 0 20px #00ffff;
  animation: glitch 3s infinite;
}

@keyframes glitch {
  0%, 90%, 100% {
    transform: translate(0);
  }
  92% {
    transform: translate(-2px, 2px);
  }
  94% {
    transform: translate(2px, -2px);
  }
}

.info-message {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  margin-bottom: 2rem;
  align-items: flex-start;
}

.info-icon {
  color: #00ffff;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.info-text {
  flex: 1;
  color: rgba(0, 255, 255, 0.8);
  font-size: 0.8rem;
  letter-spacing: 0.05rem;
  line-height: 1.5;
}

.info-text p {
  margin: 0.25rem 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  color: rgba(0, 255, 255, 0.7);
  font-size: 0.7rem;
  letter-spacing: 0.2rem;
}

.input-wrapper {
  position: relative;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(0, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.5);
  color: #00ffff;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  transition: all 0.3s;
  clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #00ffff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.05);
}

.submit-button {
  padding: 1rem;
  background: #00ffff;
  color: #000;
  border: none;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.3rem;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  transition: all 0.3s;
  clip-path: polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%);
  box-shadow: 
    0 0 20px rgba(0, 255, 255, 0.5),
    inset 0 0 20px rgba(0, 255, 255, 0.2);
  margin-top: 1rem;
}

.submit-button:hover {
  background: #00cccc;
  box-shadow: 
    0 0 30px rgba(0, 255, 255, 0.8),
    inset 0 0 30px rgba(0, 255, 255, 0.3);
  transform: translateY(-2px);
}

.toggle-link {
  background: none;
  border: none;
  color: rgba(0, 255, 255, 0.7);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 0.7rem;
  letter-spacing: 0.1rem;
  text-decoration: none;
  text-align: center;
  transition: color 0.3s;
  font-family: 'Courier New', monospace;
}

.toggle-link:hover {
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff;
}

.error-message {
  color: #ff0066;
  text-align: center;
  font-size: 0.8rem;
  padding: 0.75rem;
  background: rgba(255, 0, 102, 0.1);
  border: 1px solid rgba(255, 0, 102, 0.3);
  letter-spacing: 0.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.error-icon {
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .auth-wrapper {
    padding: 1rem;
  }
  
  .auth-container {
    padding: 1.5rem;
  }
  
  .glitch {
    font-size: 1.4rem;
    letter-spacing: 0.2rem;
  }
  
  .info-message {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .utility-buttons-top {
    top: 70px;
    right: 20px;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .tech-button {
    padding: 0.4rem 1rem;
    font-size: 0.6rem;
  }
  
  .corner {
    width: 40px;
    height: 40px;
  }
}
</style>
