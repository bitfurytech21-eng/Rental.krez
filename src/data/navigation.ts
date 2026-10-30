export interface NavLink {
  label: string;
  path: string;
}

export const MAIN_NAV_LINKS: NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'Marketplace', path: '/properties' },
  { label: 'Trust Centre', path: '/trust' },
  { label: 'Insights & Dossiers', path: '/insights' },
  { label: 'Success Stories', path: '/casos-de-exito' },
  { label: 'The Agency', path: '/agency' },
  { label: 'Company News', path: '/news' },
  { label: 'Membership Club', path: '/club' },
  { label: 'Wealth Advisory', path: '/wealth' },
  { label: 'Blog', path: '/blog' },
  { label: 'How It Works', path: '/investing' },
  { label: 'Tokenization', path: '/token' },
  { label: 'Legal Centre', path: '/legal' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
];

export const FOOTER_LINKS = {
  platform: [
    { label: 'All Properties', path: '/properties' },
    { label: 'Institutional Trust Centre', path: '/trust' },
    { label: 'Solana Token Architecture', path: '/token' },
    { label: 'How Tokenization Works', path: '/investing' },
    { label: 'Real Estate Dossiers & Insights', path: '/insights' },
    { label: 'Success Stories & Realized Exits', path: '/casos-de-exito' },
    { label: 'Kretz Club Privé', path: '/club' },
    { label: 'Company News & Broadcasts', path: '/news' },
  ],
  legal: [
    { label: 'Legal Documentation Centre (12 Docs)', path: '/legal' },
    { label: 'Terms and Conditions', path: '/legal?doc=terms-and-conditions' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Cookie Policy', path: '/cookies' },
    { label: 'Risk Disclosure Statement', path: '/legal?doc=risk-disclosure-statement' },
    { label: 'Investment & Subscription Terms', path: '/legal?doc=investment-agreement' },
    { label: 'AML/KYC & Custody Safeguards', path: '/legal?doc=aml-kyc-policy' },
  ],
  support: [
    { label: 'Help Center & FAQ', path: '/faq' },
    { label: 'Passkeys & Security Guide', path: '/guide' },
    { label: 'Direct Advisory Contact', path: '/contact' },
    { label: 'Complaints & Dispute Resolution', path: '/legal?doc=complaints-and-dispute-resolution' },
    { label: 'Institutional Desk', path: '/contact#institutional' },
  ],
};
