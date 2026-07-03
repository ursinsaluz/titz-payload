/** Minimaler Lexical-→-HTML-Serializer für Payload-RichText. */

interface LexicalNode {
  type?: string
  tag?: string
  text?: string
  format?: number | string
  listType?: string
  url?: string
  newTab?: boolean
  children?: LexicalNode[]
  fields?: { url?: string; newTab?: boolean }
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function renderText(node: LexicalNode): string {
  let html = escape(node.text ?? '')
  const format = typeof node.format === 'number' ? node.format : 0
  if (format & 1) html = `<strong>${html}</strong>`
  if (format & 2) html = `<em>${html}</em>`
  if (format & 8) html = `<u>${html}</u>`
  return html
}

function renderNode(node: LexicalNode): string {
  switch (node.type) {
    case 'text':
      return renderText(node)
    case 'linebreak':
      return '<br>'
    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`
    case 'heading':
      return `<${node.tag}>${renderChildren(node)}</${node.tag}>`
    case 'quote':
      return `<blockquote>${renderChildren(node)}</blockquote>`
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      return `<${tag}>${renderChildren(node)}</${tag}>`
    }
    case 'listitem':
      return `<li>${renderChildren(node)}</li>`
    case 'link': {
      const url = node.fields?.url ?? node.url ?? '#'
      const target = (node.fields?.newTab ?? node.newTab) ? ' target="_blank" rel="noopener"' : ''
      return `<a href="${escape(url)}"${target}>${renderChildren(node)}</a>`
    }
    case 'horizontalrule':
      return '<hr>'
    default:
      return renderChildren(node)
  }
}

function renderChildren(node: LexicalNode): string {
  return (node.children ?? []).map(renderNode).join('')
}

export function lexicalToHtml(value: unknown): string {
  const root = (value as { root?: LexicalNode } | null)?.root
  if (!root) return ''
  return renderChildren(root)
}
