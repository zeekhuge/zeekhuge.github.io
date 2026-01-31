import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'ZeekHuge',
  description: 'A place to publish my incomprehensible ramblings',
  href: 'https://zeekhuge.me',
  author: 'ZeekHuge',
  locale: 'en-US',
  featuredPostCount: 2,
  postsPerPage: 5,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/blog',
    label: 'post',
  },
  {
    href: '/authors',
    label: 'authors',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/ZeekHuge',
    label: 'GitHub',
  },
  {
    href: 'mailto:contact@zeekhuge.me',
    label: 'Email',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
  },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
