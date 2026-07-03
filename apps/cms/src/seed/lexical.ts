/** Baut Lexical-RichText-JSON aus dem einfachen Content-Inventar-Format. */

interface ContentNode {
  type: string
  text?: string
  level?: string | number
  ordered?: boolean
  items?: string[]
}

const textNode = (text: string, format = 0) => ({
  type: 'text',
  text,
  format,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const base = { direction: 'ltr', format: '', indent: 0, version: 1 }

function convertNode(node: ContentNode): Record<string, unknown> | null {
  switch (node.type) {
    case 'lead':
      return { ...base, type: 'paragraph', children: [textNode(node.text ?? '', 1)] }
    case 'paragraph':
    case 'text':
      return { ...base, type: 'paragraph', children: [textNode(node.text ?? '')] }
    case 'heading': {
      const level = Number(node.level ?? 2)
      return { ...base, type: 'heading', tag: `h${Math.min(Math.max(level, 1), 6)}`, children: [textNode(node.text ?? '')] }
    }
    case 'list':
      return {
        ...base,
        type: 'list',
        listType: node.ordered ? 'number' : 'bullet',
        tag: node.ordered ? 'ol' : 'ul',
        start: 1,
        children: (node.items ?? []).map((item, index) => ({
          ...base,
          type: 'listitem',
          value: index + 1,
          children: [textNode(item)],
        })),
      }
    case 'divider':
      return { ...base, type: 'horizontalrule' }
    default:
      return node.text ? { ...base, type: 'paragraph', children: [textNode(node.text)] } : null
  }
}

export function toLexical(nodes: ContentNode[] | string): unknown {
  const list = typeof nodes === 'string' ? [{ type: 'paragraph', text: nodes }] : nodes
  return {
    root: {
      ...base,
      type: 'root',
      children: list.map(convertNode).filter(Boolean),
    },
  }
}
