import { useEffect, useRef, useCallback } from 'react'

// ── Animated Neural Network Background ───────────────────────────────────────
// Canvas-based, 60fps, responds to mouse. Zero external deps.
export default function NeuralBg({ nodeCount = 55, color = '#8B5CF6', opacity = 0.6 }) {
  const canvasRef = useRef(null)
  const mouse     = useRef({ x: -9999, y: -9999 })
  const frameRef  = useRef(null)
  const nodes     = useRef([])

  const initNodes = useCallback((w, h) => {
    nodes.current = Array.from({ length: nodeCount }, () => ({
      x:  Math.random() * w,
      y:  Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r:  1.5 + Math.random() * 2,
    }))
  }, [nodeCount])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = 0, H = 0

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
      if (nodes.current.length === 0) initNodes(W, H)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 } }
    canvas.parentElement?.addEventListener('mousemove', onMouse)
    canvas.parentElement?.addEventListener('mouseleave', onLeave)

    // Parse hex to rgb
    const h2r = hex => {
      const n = parseInt(hex.replace('#',''), 16)
      return [(n>>16)&255, (n>>8)&255, n&255]
    }
    const [r, g, b] = h2r(color)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const nd = nodes.current
      const mx = mouse.current.x
      const my = mouse.current.y

      // Update positions
      for (const n of nd) {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      }

      // Draw connections
      const maxDist = 130
      const mouseDist = 180
      for (let i = 0; i < nd.length; i++) {
        for (let j = i + 1; j < nd.length; j++) {
          const dx = nd[i].x - nd[j].x
          const dy = nd[i].y - nd[j].y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.35 * opacity
            ctx.beginPath()
            ctx.moveTo(nd[i].x, nd[i].y)
            ctx.lineTo(nd[j].x, nd[j].y)
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
        // Mouse connection
        const mdx = nd[i].x - mx
        const mdy = nd[i].y - my
        const mdist = Math.sqrt(mdx*mdx + mdy*mdy)
        if (mdist < mouseDist) {
          const alpha = (1 - mdist / mouseDist) * 0.7 * opacity
          ctx.beginPath()
          ctx.moveTo(nd[i].x, nd[i].y)
          ctx.lineTo(mx, my)
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Draw nodes
      for (const n of nd) {
        const mdx = n.x - mx; const mdy = n.y - my
        const mdist = Math.sqrt(mdx*mdx + mdy*mdy)
        const isNear = mdist < mouseDist
        const nodeOpacity = isNear ? Math.min(1, 0.6 + (1 - mdist/mouseDist) * 0.5) * opacity : 0.4 * opacity
        const nodeR = isNear ? n.r * (1 + (1 - mdist/mouseDist) * 0.8) : n.r

        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeR, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${nodeOpacity})`
        ctx.fill()

        if (isNear) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, nodeR * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${nodeOpacity * 0.15})`
          ctx.fill()
        }
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frameRef.current)
      ro.disconnect()
      canvas.parentElement?.removeEventListener('mousemove', onMouse)
      canvas.parentElement?.removeEventListener('mouseleave', onLeave)
    }
  }, [color, opacity, initNodes])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}
