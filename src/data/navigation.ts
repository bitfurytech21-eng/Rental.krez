export interface NavLink {
  label: string;
  path: string;
}

export const MAIN_NAV_LINKS: NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'Marketplace', path: '/properties' },
  { label: 'Success Stories', path: '/casos-de-exito' },
  { label: 'The Agency', path: '/agency' },
  { label: 'Membership Club', path: '/club' },
  { label: 'Wealth Advisory', path: '/wealth' },
  { label: 'Blog', path: '/blog' },
  { label: 'How It Works', path: '/investing' },
  { label: 'Tokenization', path: '/token' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
];

export const FOOTER_LINKS = {
  platform: [
    { label: 'All Properties', path: '/properties' },
    { label: 'Success Stories & Realized Exits', path: '/casos-de-exito' },
    { label: 'Real Estate Blog & Insights', path: '/blog' },
    { label: 'Kretz Club Privé', path: '/club' },
    { label: 'How It Works', path: '/investing' },
    { label: 'Token Model & Liquidity', path: '/token' },
    { label: 'Platform Performance', path: '/properties#performance' },
  ],
  legal: [
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Risk Disclosure & Warnings', path: '/terms#risks' },
    { label: 'Investor Protection Notice', path: '/terms#protection' },
  ],
  support: [
    { label: 'Help Center & FAQ', path: '/faq' },
    { label: 'Passkeys & Security Guide', path: '/guide' },
    { label: 'Direct Contact', path: '/contact' },
    { label: 'Compliance & KYC', path: '/faq#kyc' },
    { label: 'Institutional Desk', path: '/contact#institutional' },
  ],
};
