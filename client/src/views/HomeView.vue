<template>
  <div class="home">
    <canvas ref="canvasRef" class="background-canvas"></canvas>
    
    <div class="scanlines"></div>
    <div class="vignette"></div>
    
    <div class="hud-corners">
      <div class="corner top-left"></div>
      <div class="corner top-right"></div>
      <div class="corner bottom-left"></div>
      <div class="corner bottom-right"></div>
    </div>

    <div class="content">
      <div class="title-container">
        <div class="hex-pattern"></div>
        <h1 class="glitch" data-text="SPIRIT OF KIRO">SPIRIT OF KIRO</h1>
        <div class="subtitle">AI-POWERED INFINITE CRAFTING</div>
        <div class="tech-line"></div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">AI MODELS</div>
          <div class="stat-value">{{ animatedStats.models }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">GENERATION</div>
          <div class="stat-value">∞</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">LATENCY</div>
          <div class="stat-value">{{ animatedStats.latency }}ms</div>
        </div>
      </div>

      <router-link to="/play" class="enter-button">
        <span class="button-text">INITIALIZE</span>
        <span class="button-hex"></span>
      </router-link>

      <div class="tech-specs">
        <div class="spec-item">BEDROCK</div>
        <div class="spec-divider">|</div>
        <div class="spec-item">DYNAMODB</div>
        <div class="spec-divider">|</div>
        <div class="spec-item">MEMORYDB</div>
        <div class="spec-divider">|</div>
        <div class="spec-item">COGNITO</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const animatedStats = ref({
  models: 0,
  latency: 0
})

let animationFrame: number
let ctx: CanvasRenderingContext2D | null = null

class WireframeObject {
  x: number
  y: number
  z: number
  rotationX: number
  rotationY: number
  rotationZ: number
  vertices: number[][]
  edges: number[][]
  scale: number
  
  constructor(x: number, y: number, z: number) {
    this.x = x
    this.y = y
    this.z = z
    this.rotationX = 0
    this.rotationY = 0
    this.rotationZ = 0
    this.scale = 40
    
    // Define vertices for a cube-like item
    this.vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ]
    
    // Define edges
    this.edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ]
  }
  
  rotate() {
    this.rotationX += 0.005
    this.rotationY += 0.008
    this.rotationZ += 0.003
  }
  
  project(vertex: number[]): [number, number] {
    let [x, y, z] = vertex
    
    // Rotate X
    let cosX = Math.cos(this.rotationX)
    let sinX = Math.sin(this.rotationX)
    let y1 = y * cosX - z * sinX
    let z1 = y * sinX + z * cosX
    
    // Rotate Y
    let cosY = Math.cos(this.rotationY)
    let sinY = Math.sin(this.rotationY)
    let x2 = x * cosY + z1 * sinY
    let z2 = -x * sinY + z1 * cosY
    
    // Rotate Z
    let cosZ = Math.cos(this.rotationZ)
    let sinZ = Math.sin(this.rotationZ)
    let x3 = x2 * cosZ - y1 * sinZ
    let y3 = x2 * sinZ + y1 * cosZ
    
    // Perspective projection
    let distance = 4
    let factor = distance / (distance + z2)
    
    return [
      this.x + x3 * this.scale * factor,
      this.y + y3 * this.scale * factor
    ]
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    const projectedVertices = this.vertices.map(v => this.project(v))
    
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 10
    ctx.shadowColor = '#00ffff'
    
    this.edges.forEach(([start, end]) => {
      const [x1, y1] = projectedVertices[start]
      const [x2, y2] = projectedVertices[end]
      
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    })
    
    // Draw vertices
    projectedVertices.forEach(([x, y]) => {
      ctx.fillStyle = '#00ffff'
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

const objects: WireframeObject[] = []

function initCanvas() {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  if (!ctx) return
  
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  
  // Create multiple wireframe objects
  objects.push(new WireframeObject(canvas.width * 0.2, canvas.height * 0.3, 0))
  objects.push(new WireframeObject(canvas.width * 0.8, canvas.height * 0.7, 0))
  objects.push(new WireframeObject(canvas.width * 0.5, canvas.height * 0.5, 0))
}

function animate() {
  if (!ctx || !canvasRef.value) return
  
  const canvas = canvasRef.value
  ctx.fillStyle = 'rgba(10, 10, 30, 0.1)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  objects.forEach(obj => {
    obj.rotate()
    obj.draw(ctx!)
  })
  
  animationFrame = requestAnimationFrame(animate)
}

function animateStats() {
  const targetModels = 5
  const targetLatency = 247
  
  const duration = 2000
  const startTime = Date.now()
  
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    animatedStats.value.models = Math.floor(targetModels * progress)
    animatedStats.value.latency = Math.floor(targetLatency * progress)
    
    if (progress >= 1) {
      clearInterval(interval)
    }
  }, 30)
}

function handleResize() {
  if (!canvasRef.value) return
  canvasRef.value.width = window.innerWidth
  canvasRef.value.height = window.innerHeight
  
  // Reposition objects
  objects[0].x = window.innerWidth * 0.2
  objects[0].y = window.innerHeight * 0.3
  objects[1].x = window.innerWidth * 0.8
  objects[1].y = window.innerHeight * 0.7
  objects[2].x = window.innerWidth * 0.5
  objects[2].y = window.innerHeight * 0.5
}

onMounted(() => {
  initCanvas()
  animate()
  animateStats()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: radial-gradient(ellipse at center, #0a0a1e 0%, #000000 100%);
  color: #00ffff;
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

.content {
  position: relative;
  z-index: 10;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.title-container {
  position: relative;
  text-align: center;
  margin-bottom: 3rem;
}

.hex-pattern {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background-image: 
    repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0, 255, 255, 0.03) 20px, rgba(0, 255, 255, 0.03) 40px),
    repeating-linear-gradient(60deg, transparent, transparent 20px, rgba(0, 255, 255, 0.03) 20px, rgba(0, 255, 255, 0.03) 40px),
    repeating-linear-gradient(120deg, transparent, transparent 20px, rgba(0, 255, 255, 0.03) 20px, rgba(0, 255, 255, 0.03) 40px);
  pointer-events: none;
}

.glitch {
  font-size: 4rem;
  font-weight: 700;
  letter-spacing: 0.3rem;
  color: #00ffff;
  text-shadow: 
    0 0 10px #00ffff,
    0 0 20px #00ffff,
    0 0 30px #00ffff;
  margin: 0;
  position: relative;
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
  96% {
    transform: translate(-2px, -2px);
  }
}

.subtitle {
  font-size: 1rem;
  letter-spacing: 0.5rem;
  color: rgba(0, 255, 255, 0.7);
  margin-top: 1rem;
  font-weight: 300;
}

.tech-line {
  width: 200px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00ffff, transparent);
  margin: 2rem auto;
  box-shadow: 0 0 10px #00ffff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
  max-width: 600px;
  width: 100%;
}

.stat-card {
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.3);
  padding: 1.5rem;
  position: relative;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), transparent);
  pointer-events: none;
}

.stat-label {
  font-size: 0.7rem;
  letter-spacing: 0.2rem;
  color: rgba(0, 255, 255, 0.6);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #00ffff;
  text-shadow: 0 0 10px #00ffff;
}

.enter-button {
  position: relative;
  display: inline-block;
  padding: 1.2rem 4rem;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.3rem;
  text-decoration: none;
  color: #000;
  background: #00ffff;
  border: none;
  clip-path: polygon(20px 0, 100% 0, calc(100% - 20px) 100%, 0 100%);
  transition: all 0.3s;
  cursor: pointer;
  box-shadow: 
    0 0 20px rgba(0, 255, 255, 0.5),
    inset 0 0 20px rgba(0, 255, 255, 0.2);
}

.enter-button:hover {
  background: #00cccc;
  box-shadow: 
    0 0 30px rgba(0, 255, 255, 0.8),
    inset 0 0 30px rgba(0, 255, 255, 0.3);
  transform: translateY(-2px);
}

.button-text {
  position: relative;
  z-index: 1;
}

.tech-specs {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 3rem;
  font-size: 0.7rem;
  letter-spacing: 0.2rem;
  color: rgba(0, 255, 255, 0.4);
}

.spec-divider {
  color: rgba(0, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .glitch {
    font-size: 2.5rem;
    letter-spacing: 0.2rem;
  }
  
  .subtitle {
    font-size: 0.7rem;
    letter-spacing: 0.3rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .enter-button {
    padding: 1rem 2.5rem;
    font-size: 1rem;
  }
  
  .tech-specs {
    flex-wrap: wrap;
    justify-content: center;
    font-size: 0.6rem;
  }
  
  .corner {
    width: 40px;
    height: 40px;
  }
}
</style>
