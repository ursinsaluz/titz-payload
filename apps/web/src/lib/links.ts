import type { Footer, Header } from '@titz/types'

/** Ein Navigationseintrag, wie ihn `fields/link.ts` im CMS erzeugt. Aus dem
    generierten Modell abgeleitet statt nachgebaut — die Handdeklaration hatte
    `linkType` und `newTab` ohne `| null`, was mit den echten Daten aus Payload
    nicht zusammenpasste. `footer.legalLinks` und `footer.columns[].links`
    haben dieselbe Form und passen darum ebenfalls. */
type NavLink = NonNullable<Header['nav']>[number] | NonNullable<Footer['legalLinks']>[number]

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
