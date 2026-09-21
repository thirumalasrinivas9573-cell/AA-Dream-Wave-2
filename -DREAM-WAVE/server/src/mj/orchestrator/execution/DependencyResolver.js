/**
 * Dependency Resolver — build and resolve task dependency graphs
 * @module mj/orchestrator/execution/DependencyResolver
 */

class DependencyResolver {
  buildGraph(tasks = []) {
    const nodes = tasks.map(t => ({
      id: t.id,
      agentType: t.agentType,
      dependencies: t.dependencies || [],
      priority: t.priority ?? 5,
    }))

    const edges = []
    for (const node of nodes) {
      for (const dep of node.dependencies) {
        edges.push({ from: dep, to: node.id })
      }
    }

    return { nodes, edges, taskCount: nodes.length }
  }

  topologicalSort(tasks = []) {
    const graph = this.buildGraph(tasks)
    const inDegree = new Map()
    const adj = new Map()

    for (const node of graph.nodes) {
      inDegree.set(node.id, 0)
      adj.set(node.id, [])
    }

    for (const edge of graph.edges) {
      adj.get(edge.from)?.push(edge.to)
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1)
    }

    const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id)
    const sorted = []

    while (queue.length > 0) {
      const id = queue.shift()
      sorted.push(id)
      for (const next of adj.get(id) || []) {
        inDegree.set(next, inDegree.get(next) - 1)
        if (inDegree.get(next) === 0) queue.push(next)
      }
    }

    if (sorted.length !== graph.nodes.length) {
      return { sorted: graph.nodes.map(n => n.id), hasCycle: true }
    }

    return { sorted, hasCycle: false }
  }

  getParallelGroups(tasks = []) {
    const { sorted, hasCycle } = this.topologicalSort(tasks)
    if (hasCycle) return [sorted]

    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const groups = []
    const completed = new Set()

    while (completed.size < sorted.length) {
      const group = sorted.filter(id => {
        if (completed.has(id)) return false
        const task = taskMap.get(id)
        return (task?.dependencies || []).every(d => completed.has(d))
      })

      if (group.length === 0) break
      groups.push(group)
      group.forEach(id => completed.add(id))
    }

    return groups
  }
}

module.exports = { DependencyResolver }
