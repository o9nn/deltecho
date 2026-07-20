import React, { useEffect, useRef, useState } from 'react'
import { getLogger } from '@deltachat-desktop/shared/logger'
import { getAgentToolExecutor } from '../DeepTreeEchoBot/AgentToolExecutor'
import './ScientificGenius.css'

const log = getLogger('render/components/ScientificGenius/KnowledgeGraph')

interface GraphNode {
  id: string
  name: string
  /** 1 for ConceptNode, 2 for Links */
  group: number
  /** node size */
  val: number
  color?: string
}

interface GraphLink {
  source: string
  target: string
  label?: string
  color?: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

/**
 * A graph node carrying force-simulation state.
 *
 * The upstream implementation used `react-force-graph-2d` for rendering.
 * That dependency is not available in this workspace, so a minimal
 * browser-safe force-directed layout is implemented inline on a canvas.
 */
interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
}

const COOLDOWN_TICKS = 300
const LINK_DISTANCE = 90
const LINK_STRENGTH = 0.02
const CHARGE_STRENGTH = 900
const CENTER_STRENGTH = 0.005
const VELOCITY_DECAY = 0.85
const FIT_PADDING = 40
const MAX_ZOOM = 2

function stepSimulation(nodes: SimNode[], links: GraphLink[]) {
  const byId = new Map(nodes.map(n => [n.id, n]))

  // Pairwise repulsion (charge)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let d2 = dx * dx + dy * dy
      if (d2 < 1) {
        dx = Math.random() - 0.5
        dy = Math.random() - 0.5
        d2 = dx * dx + dy * dy + 0.01
      }
      const d = Math.sqrt(d2)
      const force = CHARGE_STRENGTH / d2
      const fx = (dx / d) * force
      const fy = (dy / d) * force
      a.vx -= fx
      a.vy -= fy
      b.vx += fx
      b.vy += fy
    }
  }

  // Spring attraction along links
  for (const link of links) {
    const a = byId.get(link.source)
    const b = byId.get(link.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const force = (d - LINK_DISTANCE) * LINK_STRENGTH
    const fx = (dx / d) * force
    const fy = (dy / d) * force
    a.vx += fx
    a.vy += fy
    b.vx -= fx
    b.vy -= fy
  }

  // Centering gravity and integration
  for (const node of nodes) {
    node.vx -= node.x * CENTER_STRENGTH
    node.vy -= node.y * CENTER_STRENGTH
    node.vx *= VELOCITY_DECAY
    node.vy *= VELOCITY_DECAY
    node.x += node.vx
    node.y += node.vy
  }
}

function nodeRadius(node: SimNode): number {
  return Math.sqrt(Math.max(node.val, 1)) * 1.8
}

function drawGraph(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  nodes: SimNode[],
  links: GraphLink[]
) {
  ctx.fillStyle = '#000011'
  ctx.fillRect(0, 0, width, height)

  if (nodes.length === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      'Knowledge graph is empty — inject knowledge below to begin',
      width / 2,
      height / 2
    )
    return
  }

  // Compute bounding box and fit the whole graph into view ("zoom to fit")
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x)
    maxY = Math.max(maxY, node.y)
  }
  const boxWidth = Math.max(maxX - minX, 1)
  const boxHeight = Math.max(maxY - minY, 1)
  const scale = Math.min(
    MAX_ZOOM,
    (width - FIT_PADDING * 2) / boxWidth,
    (height - FIT_PADDING * 2) / boxHeight
  )
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(scale, scale)
  ctx.translate(-centerX, -centerY)

  const byId = new Map(nodes.map(n => [n.id, n]))

  // Links with directional arrows
  for (const link of links) {
    const a = byId.get(link.source)
    const b = byId.get(link.target)
    if (!a || !b) continue
    const color = link.color || 'rgba(255, 255, 255, 0.4)'
    ctx.strokeStyle = color
    ctx.lineWidth = 1 / scale
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()

    // Arrow head near the target node
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / d
    const uy = dy / d
    const tipX = b.x - ux * (nodeRadius(b) + 2)
    const tipY = b.y - uy * (nodeRadius(b) + 2)
    const arrowSize = 3.5
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    ctx.lineTo(
      tipX - ux * arrowSize - uy * (arrowSize / 2),
      tipY - uy * arrowSize + ux * (arrowSize / 2)
    )
    ctx.lineTo(
      tipX - ux * arrowSize + uy * (arrowSize / 2),
      tipY - uy * arrowSize - ux * (arrowSize / 2)
    )
    ctx.closePath()
    ctx.fill()
  }

  // Nodes with labels
  for (const node of nodes) {
    ctx.fillStyle = node.color || '#4facfe'
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius(node), 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.font = `${10 / scale}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(node.name, node.x, node.y + nodeRadius(node) + 2 / scale)
  }

  ctx.restore()
}

export const KnowledgeGraph: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const simNodesRef = useRef<Map<string, SimNode>>(new Map())
  const simLinksRef = useRef<GraphLink[]>([])
  const cooldownRef = useRef<number>(COOLDOWN_TICKS)

  useEffect(() => {
    // Handle resize
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', updateDimensions)
    updateDimensions()

    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    const executor = getAgentToolExecutor()
    if (!executor) {
      log.warn('AgentToolExecutor singleton not available')
      return
    }

    // Initial fetch of atoms to populate the graph
    const fetchInitialData = async () => {
      try {
        const result = await executor.executeTool(
          {
            id: `initial-fetch-${Date.now()}`,
            name: 'query_knowledge',
            input: { queryType: 'by_type', target: 'ConceptNode' },
          },
          0
        )

        if (
          result.success &&
          result.metadata &&
          typeof result.metadata.count === 'number'
        ) {
          // This is a simplification - real implementation would fetch all atoms
          log.info(`Fetched ${result.metadata.count} initial ConceptNodes`)
        }
      } catch (err) {
        log.error('Failed to fetch initial graph data', err)
      }
    }

    fetchInitialData()

    const unsubscribe = executor.subscribe((event: any) => {
      if (
        event.type === 'knowledge_stored' ||
        event.type === 'knowledge_updated'
      ) {
        const { atom, type } = event.data
        // Parse atom string: e.g., (InheritanceLink (ConceptNode "A") (ConceptNode "B"))
        // This is a naive parser for visualization purposes

        // Helper to extract name from ConceptNode "Name"
        const extractName = (str: string) => {
          const match = str.match(/"([^"]+)"/)
          return match ? match[1] : str
        }

        log.info('Visualizing atom:', atom)

        setGraphData((prev: GraphData) => {
          const newNodes = [...prev.nodes]
          const newLinks = [...prev.links]

          // Naive parsing logic for specific Link types we care about
          if (type === 'InheritanceLink' || type === 'SimilarityLink') {
            // usage regex to find source and target nodes
            // Format: (InheritanceLink (ConceptNode "A") (ConceptNode "B"))
            const matches = atom.match(/\(ConceptNode "([^"]+)"\)/g)

            if (matches && matches.length >= 2) {
              const sourceName = extractName(matches[0])
              const targetName = extractName(matches[1])

              // Add nodes if they don't exist
              if (!newNodes.find(n => n.id === sourceName)) {
                newNodes.push({
                  id: sourceName,
                  name: sourceName,
                  group: 1,
                  val: 5,
                  color: '#4facfe',
                })
              }
              if (!newNodes.find(n => n.id === targetName)) {
                newNodes.push({
                  id: targetName,
                  name: targetName,
                  group: 1,
                  val: 5,
                  color: '#4facfe',
                })
              }

              // Add link
              // Check duplication
              const linkExists = newLinks.some(
                l => l.source === sourceName && l.target === targetName
              )

              if (!linkExists) {
                newLinks.push({
                  source: sourceName,
                  target: targetName,
                  label: type,
                  color: type === 'InheritanceLink' ? '#ff0000' : '#00ff00',
                })
              }
            }
          } else if (type === 'ConceptNode') {
            const name = extractName(atom)
            if (!newNodes.find(n => n.id === name)) {
              newNodes.push({
                id: name,
                name: name,
                group: 1,
                val: 5,
                color: '#4facfe',
              })
            }
          }

          return { nodes: newNodes, links: newLinks }
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Sync the force simulation state with the declarative graph data
  useEffect(() => {
    const sim = simNodesRef.current
    const seen = new Set<string>()

    for (const node of graphData.nodes) {
      seen.add(node.id)
      const existing = sim.get(node.id)
      if (existing) {
        existing.name = node.name
        existing.color = node.color
        existing.val = node.val
      } else {
        const angle = Math.random() * Math.PI * 2
        const radius = 30 + Math.random() * 60
        sim.set(node.id, {
          ...node,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        })
      }
    }

    for (const id of Array.from(sim.keys())) {
      if (!seen.has(id)) {
        sim.delete(id)
      }
    }

    simLinksRef.current = graphData.links.filter(
      l => sim.has(l.source) && sim.has(l.target)
    )

    // Re-heat the simulation whenever the data changes
    cooldownRef.current = COOLDOWN_TICKS
  }, [graphData])

  // Animation / simulation loop
  useEffect(() => {
    let rafId = 0

    const frame = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const nodes = Array.from(simNodesRef.current.values())
          const links = simLinksRef.current

          if (cooldownRef.current > 0 && nodes.length > 0) {
            stepSimulation(nodes, links)
            cooldownRef.current -= 1
          }

          drawGraph(ctx, dimensions.width, dimensions.height, nodes, links)
        }
      }
      rafId = window.requestAnimationFrame(frame)
    }

    rafId = window.requestAnimationFrame(frame)
    return () => window.cancelAnimationFrame(rafId)
  }, [dimensions])

  return (
    <div ref={containerRef} className='knowledge-graph-container'>
      <canvas
        ref={canvasRef}
        className='knowledge-graph-canvas'
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  )
}
