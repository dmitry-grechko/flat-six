export const NAV_FEATURES = [
  { name: '3D visualization', desc: 'Orbit, X-ray & trace every line', href: '/features/xray' },
  { name: 'Fault finding', desc: 'Symptoms ranked to their cause', href: '/features/fault-finding' },
  { name: 'Service history', desc: 'Log every job, keep the record', href: '/features/service-history' },
  { name: 'Service plans', desc: 'Plan the jobs coming up', href: '/features/service-plans' },
  { name: 'DIY tools', desc: 'Wheel, tyre & alignment math', href: '/features/tools' },
  { name: 'Multi-car garage', desc: 'Every Boxster & Cayman you own', href: '/features/multi-car' },
  { name: 'AI assistant', desc: 'Manage it all just by chatting', href: '/features/ai' },
] as const;

export const NAV_MODELS = [
  { name: '987', full: 'Boxster & Cayman', years: '2005–2012', href: '/987' },
  { name: '981', full: 'Boxster & Cayman', years: '2012–2016', href: '/981' },
] as const;

export const FOOTER_FEATURES = [
  { href: '/features/xray', label: '3D visualization' },
  { href: '/features/fault-finding', label: 'Fault finding' },
  { href: '/features/service-history', label: 'Service history' },
  { href: '/features/service-plans', label: 'Service plans' },
  { href: '/features/tools', label: 'DIY tools' },
  { href: '/features/multi-car', label: 'Multi-car garage' },
  { href: '/features/ai', label: 'AI assistant' },
] as const;

export type NavActive = 'home' | 'features' | 'models' | 'guides' | 'faults' | 'about';
