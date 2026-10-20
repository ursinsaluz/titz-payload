/** Minimaler Lexical-→-HTML-Serializer für Payload-RichText. */
import { mediaSrcSet, mediaUrl, type Media } from './payload'

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
  relationTo?: string
  value?: unknown
}

export interface LexicalOptionen {
  videoPoster?: string
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

function renderUpload(node: LexicalNode, optionen?: LexicalOptionen): string {
  if (node.relationTo !== 'media' || !node.value || typeof node.value !== 'object') return ''
  const media = node.value as Media
  const legende = media.caption ? `<figcaption>${escape(media.caption)}</figcaption>` : ''

  if (media.mimeType?.startsWith('video/')) {
    const quelle = mediaUrl(media)
    if (!quelle) return ''
    const poster = optionen?.videoPoster ? ` poster="${escape(optionen.videoPoster)}"` : ''
    const masse =
      media.width && media.height ? ` width="${media.width}" height="${media.height}"` : ''
    return `<figure class="richtext-media richtext-media--video"><video controls preload="metadata" playsinline src="${escape(quelle)}"${poster}${masse}></video>${legende}</figure>`
  }

  const bild = mediaUrl(media, { breite: 760 })
  if (!bild) return ''
  const responsiv = mediaSrcSet(media, 760)
  const srcset = responsiv
    ? ` srcset="${escape(responsiv.srcset)}" sizes="${escape(responsiv.sizes)}"`
    : ''
  const masse =
    media.width && media.height ? ` width="${media.width}" height="${media.height}"` : ''
  return `<figure class="richtext-media"><img src="${escape(bild)}"${srcset} alt="${escape(media.alt ?? '')}"${masse} loading="lazy" decoding="async">${legende}</figure>`
}

function renderNode(node: LexicalNode, optionen?: LexicalOptionen): string {
  switch (node.type) {
    case 'text':
      return renderText(node)
    case 'linebreak':
      return '<br>'
    case 'paragraph':
      return `<p>${renderChildren(node, optionen)}</p>`
    case 'heading':
      return `<${node.tag}>${renderChildren(node, optionen)}</${node.tag}>`
    case 'quote':
      return `<blockquote>${renderChildren(node, optionen)}</blockquote>`
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      return `<${tag}>${renderChildren(node, optionen)}</${tag}>`
    }
    case 'listitem':
      return `<li>${renderChildren(node, optionen)}</li>`
    case 'link': {
      const url = node.fields?.url ?? node.url ?? '#'
      const target = (node.fields?.newTab ?? node.newTab) ? ' target="_blank" rel="noopener"' : ''
      return `<a href="${escape(url)}"${target}>${renderChildren(node, optionen)}</a>`
    }
    case 'upload':
      return renderUpload(node, optionen)
    case 'horizontalrule':
      return '<hr>'
    default:
      return renderChildren(node, optionen)
  }
}

function renderChildren(node: LexicalNode, optionen?: LexicalOptionen): string {
  return (node.children ?? []).map((kind) => renderNode(kind, optionen)).join('')
}

export function lexicalToHtml(value: unknown, optionen?: LexicalOptionen): string {
  const root = (value as { root?: LexicalNode } | null)?.root
  if (!root) return ''
  return renderChildren(root, optionen)
}

/** Prüft, ob ein Lexical-Feld tatsächlich darstellbare Knoten enthält. */
export function hatLexicalInhalt(value: unknown): boolean {
  const kinder = (value as { root?: { children?: LexicalNode[] } } | null)?.root?.children
  return Array.isArray(kinder) && kinder.length > 0
}

/** Reiner Textauszug aus einem Lexical-Baum, etwa für WebMCP-Antworten. */
export function lexicalToPlainText(value: unknown): string {
  const root = (value as { root?: LexicalNode } | null)?.root
  if (!root) return ''
  const teile: string[] = []
  const sammle = (knoten: LexicalNode) => {
    if (knoten.type === 'text' && knoten.text) teile.push(knoten.text)
    for (const kind of knoten.children ?? []) sammle(kind)
    if (knoten.type === 'paragraph' || knoten.type === 'heading' || knoten.type === 'listitem') {
      teile.push('\n')
    }
  }
  sammle(root)
  return teile
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
