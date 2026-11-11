export interface FAQItem {
  id: string;
  category: 'General' | 'Investment' | 'Yields' | 'Security & Legal' | 'Deposits & Withdrawals';
  question: string;
  answer: string;
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'General',
    question: 'What is Kretz and how does tokenized real estate work?',
    answer: 'Kretz is a European fractional real estate investment platform that democratizes access to institutional-grade and luxury properties. Each property is acquired through a dedicated special purpose vehicle (SPV) and divided into digital participatory units. By holding tokens, you receive legal rights to the economic benefits of the asset: proportional monthly rental yields and your share of capital appreciation upon property sale.',
  },
  {
    id: 'faq-2',
    category: 'Investment',
    question: 'What is the minimum investment required?',
    answer: 'The minimum investment depends on the certified property tier, enabling qualified investors to build a diversified portfolio without taking on high-interest mortgages or single-asset concentration risk.',
  },
  {
    id: 'faq-3',
    category: 'Yields',
    question: 'How and when are rental returns distributed?',
    answer: 'Rental yields are distributed automatically on a monthly basis directly to your account wallet. Distributions represent actual tenant net rent after deducting property management fees, local taxes, insurance, and maintenance provisions. You can withdraw funds to your bank account or reinvest them in new properties.',
  },
  {
    id: 'faq-4',
    category: 'Yields',
    question: 'Are returns guaranteed?',
    answer: 'No. In compliance with European financial regulations, projected returns are realistic estimates based on rigorous third-party appraisal, historical tenancy rates, and conservative stress models, not guarantees. Real estate values and rental demand can fluctuate with macroeconomic conditions.',
  },
  {
    id: 'faq-5',
    category: 'Deposits & Withdrawals',
    question: 'What payment and deposit methods are accepted?',
    answer: 'We support standard SEPA bank transfers in Euros, debit/credit cards, as well as crypto deposits in stablecoins (USDT & USDC on the Polygon POS network). All deposits are credited directly to your investor wallet balance.',
  },
  {
    id: 'faq-6',
    category: 'Deposits & Withdrawals',
    question: 'How do withdrawals work and what are the processing times?',
    answer: 'Available wallet funds (uninvested cash or collected rental dividends) can be withdrawn at any time. SEPA bank transfers are processed within 1 to 2 business days. Crypto stablecoin withdrawals undergo automated compliance security screening and execute on-chain within 15–45 minutes.',
  },
  {
    id: 'faq-7',
    category: 'Security & Legal',
    question: 'What is the legal structure of my ownership?',
    answer: 'Each property is owned outright by an independent Special Purpose Vehicle (SL / SARL). When you invest, you enter into a legally enforceable participatory debt contract or tokenized equity agreement registered with regulatory transparency. Even in the unlikely event that the platform ceased operations, the property assets remain ring-fenced and owned by the SPV on behalf of investors.',
  },
  {
    id: 'faq-8',
    category: 'Security & Legal',
    question: 'Why do I need to complete identity verification (KYC)?',
    answer: 'In compliance with European Anti-Money Laundering (AML5/6) and Counter-Terrorist Financing regulations, all investors must verify their identity before funding investments or withdrawing capital. Verification takes approximately 2 minutes by uploading a valid passport or national ID card.',
  },
  {
    id: 'faq-9',
    category: 'Investment',
    question: 'Can I sell my tokens before the property is sold?',
    answer: 'Yes. While property projects typically have a planned horizon of 36 to 60 months, token holders can access secondary liquidity through our peer-to-peer bulletin board and compliant secondary trading channels, allowing you to liquidate your position to other verified community members.',
  },
  {
    id: 'faq-10',
    category: 'Security & Legal',
    question: 'What platform fees does Kretz charge?',
    answer: 'We prioritize transparent alignment: a one-time 3–5% property structuring and acquisition fee (already factored into the initial target funding amount), a 10% monthly property management fee deducted from gross rental income, and 0% withdrawal fees for SEPA transfers.',
  },
];
