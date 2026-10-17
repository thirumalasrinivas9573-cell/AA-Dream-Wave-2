import { useEffect, useRef } from 'react'


/**
 * Futuristic3DBg — 60fps Interactive 3D Cosmic Neural Environment
 * - 3D particle space with dynamic camera projection
 * - Gyroscopic orbital rings rotating in 3D
 * - Interactive mouse parallax with smooth damping
 * - Celestial nebula glow gradients (Deep Black, Electric Cyan, Neon Purple)
 */
export default function Futuristic3DBg({
  particleCount = 70,
  accentColor = '#8B5CF6',
  cyanColor = '#38BDF8',
  speed = 0.6,
}) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    rotation: { x: 0, y: 0 },
    particles: [],
    rings: [],
    polyhedra: [],
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      initScene()
    }
    window.addEventListener('resize', handleResize)

    const handleMouseMove = (e) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      stateRef.current.mouse.targetX = (e.clientX - cx) / cx
      stateRef.current.mouse.targetY = (e.clientY - cy) / cy
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Helper: Initialize 3D particle nodes, gyroscopic rings, and wireframe objects
    const initScene = () => {
      const particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: (Math.random() - 0.5) * 1200,
          y: (Math.random() - 0.5) * 1200,
          z: Math.random() * 1000 - 200,
          vx: (Math.random() - 0.5) * 0.4 * speed,
          vy: (Math.random() - 0.5) * 0.4 * speed,
          vz: (Math.random() - 0.5) * 0.5 * speed,
          radius: Math.random() * 2.2 + 1,
          color: i % 3 === 0 ? cyanColor : i % 2 === 0 ? accentColor : '#FFFFFF',
          pulse: Math.random() * Math.PI * 2,
        })
      }

      // Gyroscopic 3D Rings
      const rings = [
        { radius: 260, tiltX: 0.7, tiltY: 0.3, speed: 0.004 * speed, color: accentColor, width: 1.5 },
        { radius: 340, tiltX: -0.5, tiltY: 0.8, speed: -0.003 * speed, color: cyanColor, width: 1.2 },
        { radius: 420, tiltX: 0.9, tiltY: -0.4, speed: 0.002 * speed, color: '#A855F7', width: 1 },
      ]

      // 3D Floating Polyhedron vertices (Octahedron)
      const s = 110
      const octaVertices = [
        { x: 0, y: -s, z: 0 },
        { x: s, y: 0, z: 0 },
        { x: 0, y: 0, z: s },
        { x: -s, y: 0, z: 0 },
        { x: 0, y: 0, z: -s },
        { x: 0, y: s, z: 0 },
      ]
      const octaEdges = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [5, 1], [5, 2], [5, 3], [5, 4],
        [1, 2], [2, 3], [3, 4], [4, 1],
      ]

      stateRef.current.particles = particles
      stateRef.current.rings = rings
      stateRef.current.polyhedra = [{
        center: { x: -width * 0.22, y: 0, z: 200 },
        rot: { x: 0.3, y: 0.4, z: 0 },
        rotSpeed: { x: 0.005 * speed, y: 0.008 * speed, z: 0.003 * speed },
        vertices: octaVertices,
        edges: octaEdges,
      }]
    }

    initScene()

    // 3D Projector function (Perspective)
    const fov = 450
    const project = (x, y, z, cx, cy) => {
      const factor = fov / (fov + z)
      return {
        x: x * factor + cx,
        y: y * factor + cy,
        scale: factor,
        visible: z > -fov + 10,
      }
    }

    // 3D Point Rotation
    const rotate3D = (x, y, z, rx, ry, rz) => {
      // Rotate around X
      let y1 = y * Math.cos(rx) - z * Math.sin(rx)
      let z1 = y * Math.sin(rx) + z * Math.cos(rx)
      // Rotate around Y
      let x2 = x * Math.cos(ry) + z1 * Math.sin(ry)
      let z2 = -x * Math.sin(ry) + z1 * Math.cos(ry)
      // Rotate around Z
      let x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz)
      let y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz)
      return { x: x3, y: y3, z: z2 }
    }

    let angle = 0
    const render = () => {
      animId = requestAnimationFrame(render)
      angle += 0.006 * speed

      // Smooth mouse interpolation (easing)
      const st = stateRef.current
      st.mouse.x += (st.mouse.targetX - st.mouse.x) * 0.06
      st.mouse.y += (st.mouse.targetY - st.mouse.y) * 0.06

      const camRotX = st.mouse.y * 0.25
      const camRotY = st.mouse.x * 0.35

      // Clear canvas with deep cosmic gradient
      ctx.clearRect(0, 0, width, height)

      // ── Ambient Background Glows ──────────────────────────────────────────
      const bgGrad = ctx.createRadialGradient(
        width * 0.25 + st.mouse.x * 60,
        height * 0.45 + st.mouse.y * 60,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.9
      )
      bgGrad.addColorStop(0, 'rgba(30, 27, 75, 0.45)') // Deep Indigo/Purple
      bgGrad.addColorStop(0.35, 'rgba(15, 23, 42, 0.75)') // Space Navy
      bgGrad.addColorStop(0.7, 'rgba(3, 7, 18, 0.95)') // Rich Obsidian Black
      bgGrad.addColorStop(1, '#030712') // Pure Space Void
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Cybernetic Ambient Light Orbs
      const cyanGlow = ctx.createRadialGradient(
        width * 0.15 + st.mouse.x * 40,
        height * 0.3 + st.mouse.y * 40,
        0,
        width * 0.15,
        height * 0.3,
        360
      )
      cyanGlow.addColorStop(0, 'rgba(56, 189, 248, 0.18)')
      cyanGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = cyanGlow
      ctx.fillRect(0, 0, width, height)

      const purpleGlow = ctx.createRadialGradient(
        width * 0.8 - st.mouse.x * 40,
        height * 0.7 - st.mouse.y * 40,
        0,
        width * 0.8,
        height * 0.7,
        420
      )
      purpleGlow.addColorStop(0, 'rgba(168, 85, 247, 0.15)')
      purpleGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = purpleGlow
      ctx.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2

      // ── Render 3D Floating Polyhedron (Left Side Feature) ─────────────────
      const poly = st.polyhedra[0]
      if (poly) {
        poly.rot.x += poly.rotSpeed.x
        poly.rot.y += poly.rotSpeed.y
        poly.rot.z += poly.rotSpeed.z

        const baseCenter = {
          x: width > 900 ? -width * 0.23 + st.mouse.x * 40 : 0,
          y: width > 900 ? st.mouse.y * 30 : -height * 0.28,
          z: 100,
        }

        const projVertices = poly.vertices.map((v) => {
          const r = rotate3D(v.x, v.y, v.z, poly.rot.x + camRotX, poly.rot.y + camRotY, poly.rot.z)
          return project(r.x + baseCenter.x, r.y + baseCenter.y, r.z + baseCenter.z, cx, cy)
        })

        // Draw Polyhedron Edges with glowing cyan/purple lines
        ctx.beginPath()
        poly.edges.forEach(([i1, i2]) => {
          const p1 = projVertices[i1]
          const p2 = projVertices[i2]
          if (p1.visible && p2.visible) {
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
          }
        })
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)'
        ctx.lineWidth = 1.6
        ctx.shadowColor = 'rgba(168, 85, 247, 0.6)'
        ctx.shadowBlur = 12
        ctx.stroke()
        ctx.shadowBlur = 0

        // Draw Polyhedron Vertices Glowing Nodes
        projVertices.forEach((p, idx) => {
          if (!p.visible) return
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3 * p.scale, 0, Math.PI * 2)
          ctx.fillStyle = idx % 2 === 0 ? '#38BDF8' : '#C084FC'
          ctx.shadowColor = '#38BDF8'
          ctx.shadowBlur = 8
          ctx.fill()
          ctx.shadowBlur = 0
        })
      }

      // ── Render 3D Gyroscopic Orbital Rings ────────────────────────────────
      st.rings.forEach((ring) => {

        const ringSteps = 48
        ctx.beginPath()
        let first = null

        const currentTiltY = ring.tiltY + angle * ring.speed * 20
        for (let i = 0; i <= ringSteps; i++) {
          const theta = (i / ringSteps) * Math.PI * 2
          const rx = Math.cos(theta) * ring.radius
          const rz = Math.sin(theta) * ring.radius
          const ry = 0

          const r = rotate3D(rx, ry, rz, ring.tiltX + camRotX, currentTiltY + camRotY, 0)
          const p = project(r.x + (width > 900 ? -width * 0.23 : 0), r.y, r.z + 100, cx, cy)

          if (p.visible) {
            if (!first) {
              ctx.moveTo(p.x, p.y)
              first = p
            } else {
              ctx.lineTo(p.x, p.y)
            }
          }
        }

        ctx.strokeStyle = ring.color === cyanColor ? 'rgba(56, 189, 248, 0.28)' : 'rgba(168, 85, 247, 0.32)'
        ctx.lineWidth = ring.width
        ctx.stroke()
      })

      // ── Render 3D Particle Space & Inter-Node Connections ──────────────────
      const projected = st.particles.map((p) => {
        // Update 3D movement
        p.x += p.vx
        p.y += p.vy
        p.z += p.vz
        p.pulse += 0.03

        if (p.x < -600 || p.x > 600) p.vx *= -1
        if (p.y < -600 || p.y > 600) p.vy *= -1
        if (p.z < -200 || p.z > 800) p.vz *= -1

        const r = rotate3D(p.x, p.y, p.z, camRotX, camRotY, 0)
        const proj = project(r.x, r.y, r.z, cx, cy)
        return { ...proj, particle: p, z: r.z }
      })

      // Draw connection lines between nearby 3D points
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i]
          const p2 = projected[j]
          if (!p1.visible || !p2.visible) continue

          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.22 * Math.min(p1.scale, p2.scale)
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // Draw Particle Points
      projected.forEach((p) => {
        if (!p.visible) return
        const pulseFactor = 0.8 + Math.sin(p.particle.pulse) * 0.25
        const size = Math.max(0.6, p.particle.radius * p.scale * pulseFactor)

        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fillStyle = p.particle.color
        ctx.shadowColor = p.particle.color
        ctx.shadowBlur = 6 * p.scale
        ctx.fill()
        ctx.shadowBlur = 0
      })
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [particleCount, accentColor, cyanColor, speed])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
