interface NavLink {
  label: string
  linkType?: 'anchor' | 'page' | 'url'
  anchor?: string | null
  page?: { slug?: string } | number | null
  url?: string | null
  newTab?: boolean
}

export function hrefFor(link: NavLink): string {
  switch (link.linkType) {
    case 'page': {
      const slug = typeof link.page === 'object' && link.page ? link.page.slug : null
      return slug ? (slug === 'home' ? '/' : `/${slug}/`) : '/'
    }
    case 'url':
      return link.url ?? '#'
    case 'anchor':
    default:
      return `/#${link.anchor ?? ''}`
  }
}

export type { NavLink }
