const COLORS = ['#f7c948', '#5cbb6f', '#4a90d9', '#e8453c', '#9b6fda', '#f5832a', '#e8668a', '#3dbfb0']

/**
 * Launch a confetti burst on the given canvas element.
 * @param {HTMLCanvasElement} canvas
 */
export function launchConfetti(canvas) {
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight

  const pieces = Array.from({ length: 120 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * -canvas.height,
    r:     4 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx:    (Math.random() - 0.5) * 3,
    vy:    2 + Math.random() * 4,
    rot:   Math.random() * 360,
    rotV:  (Math.random() - 0.5) * 8,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }))

  let frame = 0

  function draw() {
    if (frame > 200) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const p of pieces) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rot * Math.PI) / 180)
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, 1 - frame / 180)

      if (p.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, p.r, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
      }

      ctx.restore()

      p.x   += p.vx
      p.y   += p.vy
      p.rot += p.rotV
      p.vy  += 0.05 // gravity
    }

    frame++
    requestAnimationFrame(draw)
  }

  draw()
}
