export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: 'Guides & Education' | 'Market Insights' | 'Regulation & Legal' | 'Case Studies';
  excerpt: string;
  content: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  publishedAt: string;
  readTime: string;
  image: string;
  tags: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-how-tokenization-works',
    slug: 'how-real-estate-tokenization-works-notarial-spv-monthly-dividends',
    title: 'How Real Estate Tokenization Works: From Notarial SPV to Monthly Dividends',
    category: 'Guides & Education',
    excerpt: 'A complete breakdown of participatory loans, blockchain token issuance on Polygon, and how monthly rental dividends are automated.',
    readTime: '6 min read',
    publishedAt: '2026-03-12',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=85',
    tags: ['Tokenization', 'Smart Contracts', 'SPV', 'Dividends'],
    author: {
      name: 'Adrián Fariza',
      role: 'Head of Real Estate Analytics',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    },
    content: `
Real estate has historically been the primary driver of generational wealth creation, but it has suffered from two major barriers: high capital requirements and severe illiquidity. Tokenization solves both problems by dividing physical properties into fractional digital representations on the blockchain.

### 1. The Legal Foundation: The Special Purpose Vehicle (SPV)
Tokenization does not mean buying an unregistered piece of computer code. Every property tokenized on the platform is acquired by a standalone Special Purpose Vehicle (Sociedad Limitada / S.L. in Spain). 
The SPV holds the registered title deed (Escritura Pública de Compraventa) inscribed in the official Property Registry (Registro de la Propiedad).

### 2. Participatory Loans and Token Minting
To allow broad public participation with minimal tickets (€100 to €1,000), investors enter into a standardized Participatory Loan Agreement (Préstamo Participativo) with the SPV. 
For every unit of capital contributed, an equivalent digital token is minted on the Polygon blockchain (ERC-20 standard). Each token legally entitles its holder to:
- A pro-rata share of all gross rental income collected each month (after operating expenses).
- A pro-rata share of the net capital gain (plusvalía) realized when the property is sold.

### 3. Automated Monthly Distribution
Every 30 days, rents collected from vetted tenants are reconciled in corporate escrow and converted into digital cash distributions directly credited to each investor's wallet. 
Investors can withdraw their capital via instant SEPA wire transfers or reinvest it into new opportunities to harness the power of compound interest.
    `,
  },
  {
    id: 'post-understanding-tir-plusvalia',
    slug: 'understanding-tir-and-plusvalia-real-estate-metrics',
    title: 'Understanding TIR (IRR) and Plusvalía: The True Mathematics of Real Estate Exits',
    category: 'Market Insights',
    excerpt: 'Why Internal Rate of Return (TIR) and capital appreciation (Plusvalía) are the most critical metrics for assessing tokenized property performance.',
    readTime: '5 min read',
    publishedAt: '2026-02-28',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85',
    tags: ['TIR', 'Plusvalía', 'ROI', 'Financial Metrics'],
    author: {
      name: 'Elena Rostova',
      role: 'Senior Portfolio Strategist',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    },
    content: `
When analyzing real estate investments, novice investors often focus solely on annual gross rental yield. However, professional institutional funds rely on the **Internal Rate of Return (TIR / IRR)** and **Capital Appreciation (Plusvalía)** to evaluate true asset performance.

### What is TIR (Tasa Interna de Retorno)?
TIR measures the annualized compound growth rate an investment yields over its entire lifespan. Unlike simple ROI, TIR takes into account the **exact timing of cash inflows and outflows**:
- Initial capital deployment at day 0.
- Monthly or quarterly rental dividend distributions throughout holding.
- Terminal capital return plus surplus when the asset is sold.

For example, a project returning a total of 15% in 6 months achieves an annualized TIR of over **32%**, whereas an asset returning 15% over 3 years yields a TIR of roughly **4.8%** per annum.

### The Role of Plusvalía in Property Flipping
Plusvalía represents the positive difference between the acquisition cost and the final sale price. On our platform, flipping projects aim to create immediate plusvalía through:
1. Discounted off-market acquisitions (buying 15-20% below market value).
2. Architectural optimization (redistributing floorplans to maximize usable square footage).
3. High-standard interior refurbishment and home staging.
    `,
  },
  {
    id: 'post-mica-regulation-rwa',
    slug: 'mica-regulation-rwa-future-tokenized-real-estate-europe',
    title: 'MiCA Regulation & Real World Assets (RWA): Europe’s Legal Framework',
    category: 'Regulation & Legal',
    excerpt: 'How the Markets in Crypto-Assets (MiCA) regulation and European securities directives provide institutional protection for tokenized real estate.',
    readTime: '7 min read',
    publishedAt: '2026-02-14',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
    tags: ['MiCA', 'Regulation', 'Compliance', 'EU Law', 'CNMV'],
    author: {
      name: 'Carlos Menéndez',
      role: 'Chief Compliance & Legal Counsel',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    content: `
The entry into force of the **Markets in Crypto-Assets (MiCA)** regulation marks a watershed moment for digital finance in the European Union. While unbacked speculative tokens face strict constraints, Real World Assets (RWA)—specifically tokenized real estate—benefit immensely from legal certainty.

### Participatory Instruments vs. Asset-Referenced Tokens
In Spain and across the EU, real estate tokenization is structured under national securities and civil commercial codes. The CNMV (Comisión Nacional del Mercado de Valores) recognizes participatory lending structures where:
- Token holders are registered as legitimate financial claimants.
- Anti-Money Laundering (AML) and Know-Your-Customer (KYC) directives are enforced before any token purchase.
- Funds are segregated in ring-fenced bank accounts, preventing co-mingling with operating company balances.

### Ring-Fenced Bankruptcy Protections
If an issuing management company were ever to enter liquidation, the physical property remains held inside its independent SPV. 
Creditors of the platform have zero claim against the underlying real estate asset or the investor distribution reserves.
    `,
  },
  {
    id: 'post-flipping-vs-rental-spain',
    slug: 'real-estate-flipping-vs-long-term-rentals-yields-spain',
    title: 'Real Estate Flipping vs. Long-Term Rentals: Comparing Yields in Spain',
    category: 'Market Insights',
    excerpt: 'Analyzing the trade-offs between rapid 4-8 month renovation flips and resilient 3-5 year corporate rental yields across Málaga, Madrid, and Valencia.',
    readTime: '6 min read',
    publishedAt: '2026-01-22',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85',
    tags: ['Málaga', 'Madrid', 'Valencia', 'Flipping', 'Rental Yield'],
    author: {
      name: 'Adrián Fariza',
      role: 'Head of Real Estate Analytics',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    },
    content: `
Spain’s real estate market offers two fundamentally distinct strategies for fractional investors: **Value-Add Flipping** and **Core Long-Term Rental**. Understanding the dynamics of both enables optimal portfolio construction.

### Strategy A: Short-Term Architectural Flips (4 to 8 Months)
- **Primary Objective:** High annualized TIR (typically 14% to 18%).
- **Primary Geographies:** Málaga, Valencia, Alicante, Madrid suburbs.
- **Mechanism:** The SPV purchases an undervalued property, carries out comprehensive interior renovation, stages the home with designer furnishings, and markets it to end buyers.
- **Investor Advantage:** Rapid capital recycling. Investors receive their original principal plus capital gains in under a year.

### Strategy B: Core Long-Term Rental (2 to 5 Years)
- **Primary Objective:** Predictable recurring cash flow (8% to 11% net yield) plus defensive inflation protection.
- **Primary Geographies:** Madrid Central (Salamanca, Chamberí), Barcelona Eixample, Palma de Mallorca.
- **Mechanism:** Long-term leases signed with corporate executives or verified families. Rents are indexed to CPI (IPC).
- **Investor Advantage:** Passive monthly income stream with long-term capital appreciation upon eventual sale.
    `,
  },
  {
    id: 'post-socimis-vs-tokenization',
    slug: 'socimis-vs-tokenized-real-estate-fractional-disruption',
    title: 'SOCIMIs vs. Tokenized Real Estate: Why Fractional Ownership is Disrupting REITs',
    category: 'Guides & Education',
    excerpt: 'How blockchain-based tokenization provides superior asset visibility, no secondary discount penalties, and direct monthly cash flows compared to traditional SOCIMIs.',
    readTime: '5 min read',
    publishedAt: '2026-01-08',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
    tags: ['SOCIMI', 'REIT', 'Fractional', 'Comparison'],
    author: {
      name: 'Elena Rostova',
      role: 'Senior Portfolio Strategist',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    },
    content: `
For decades, European investors looking for real estate exposure without managing properties relied on SOCIMIs (Sociedades Cotizadas de Inversión en el Mercado Inmobiliario), the Spanish equivalent of REITs. While useful, tokenization addresses key limitations of traditional listed real estate vehicles:

| Feature | Traditional SOCIMI / REIT | Tokenized Real Estate |
| :--- | :--- | :--- |
| **Asset Transparency** | Blind pool of dozens of assets | Exact 1:1 visibility into the specific building |
| **Minimum Ticket** | Share price (often volatile stock market) | €100 - €1,000 fixed participatory token |
| **Dividend Frequency** | Annual or semi-annual | Automated monthly distributions |
| **Market Volatility** | Subject to public equity stock sell-offs | Tied strictly to physical real estate appraisal |
| **Management Fees** | Heavy corporate board & listing overhead | Lean smart contract automated administration |
    `,
  },
  {
    id: 'post-family-offices-web3',
    slug: 'family-offices-web3-deploying-treasury-into-tokenized-property',
    title: 'Institutional Family Offices: Deploying Liquidity into Asset-Backed Tokens',
    category: 'Market Insights',
    excerpt: 'Why multi-family offices in Zurich, Madrid, and Paris are allocating treasury reserves into short-duration tokenized real estate notes.',
    readTime: '6 min read',
    publishedAt: '2025-12-15',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85',
    tags: ['Family Office', 'Treasury', 'Institutional', 'Wealth Management'],
    author: {
      name: 'Carlos Menéndez',
      role: 'Chief Compliance & Legal Counsel',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    content: `
Family offices manage generational wealth with a strict dual mandate: capital preservation first, and inflation-beating yield second. In an era of sovereign debt uncertainty and volatile public equities, short-duration asset-backed tokens provide a compelling treasury instrument.

### The Problem with Traditional Real Estate Illiquidity
Buying an entire €5M building requires extensive due diligence, months of closing friction, high stamp duty transfer taxes, and significant management overhead. 

### The Tokenized Alternative
By deploying €100,000 to €500,000 tickets across 10 to 20 vetted residential flips and prime rental units:
1. Risk is diversified across independent legal SPVs and varied metropolitan micro-markets.
2. Returns are received in steady monthly tranches.
3. Liquidity is maintained through P2P secondary bulletin board transfers if reallocation is required.
    `,
  },
  {
    id: 'post-taxation-tokenized-real-estate',
    slug: 'taxation-tokenized-real-estate-spain-eu-irpf-modelo-721',
    title: 'Taxation of Tokenized Real Estate in Spain: Complete Guide to IRPF, Modelo 721 & Withholdings',
    category: 'Regulation & Legal',
    excerpt: 'How yields from participatory loans and tokenized property capital gains are taxed in Spain for both resident and non-resident international investors.',
    readTime: '8 min read',
    publishedAt: '2025-11-30',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=85',
    tags: ['Taxation', 'Spain', 'IRPF', 'Modelo 721', 'Withholdings'],
    author: {
      name: 'Carlos Menéndez',
      role: 'Chief Compliance & Legal Counsel',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    content: `
Navigating tax obligations is a fundamental requirement for every serious real estate investor. Because tokenized real estate in Spain is governed by **Participatory Loans (Préstamos Participativos)** issued by registered SPVs, its fiscal treatment differs fundamentally from holding physical real estate or trading speculative crypto.

### 1. Monthly Rental Dividends: Yield on Movable Capital (Rendimientos del Capital Mobiliario)
The monthly cash dividends generated by tenant rents and distributed by the SPV are classified under Spanish personal income tax (IRPF) as *Rendimientos del Capital Mobiliario* (savings tax base):
- Spanish tax residents are subject to the progressive savings tax brackets (19% on the first €6,000, 21% up to €50,000, 23% up to €200,000, and 28% thereafter).
- The SPV automatically applies the statutory 19% Spanish withholding tax at source on all distributions paid to Spanish residents, simplifying annual tax declarations.
- At the end of each fiscal tax year, investors receive an official Notarial Fiscal Certificate detailing gross yields, withholdings deducted, and net amounts credited.

### 2. Capital Gains on Asset Sale (Ganancias Patrimoniales)
When a property flip or divestment concludes, the plusvalía returned to token holders is treated as a capital gain in the savings base. If an investor holds a token that appreciated from €100 to €115, the €15 gain is declared in the annual IRPF return.

### 3. Non-Resident Investors (IRNR)
European Union and international investors benefit from Double Taxation Treaties (CDI). For non-residents holding Spanish tokenized participatory notes, withholding rates typically default to 19% for EU/EEA residents (or 24% for non-EU residents), unless reduced under bilateral tax treaties with an official tax residency certificate.

### 4. What About Modelo 721 (Crypto Asset Declaration)?
Because our tokens represent participatory claims against a Spanish legal entity (S.L.) with assets located on Spanish territory, they are domestic instruments. Token holders do not need to declare domestic Spanish SPV assets under cross-border Modelo 721 or Modelo 720 foreign asset disclosures.
    `,
  },
  {
    id: 'post-secondary-market-liquidity',
    slug: 'secondary-market-liquidity-p2p-bulletin-board-trading',
    title: 'Secondary Market Liquidity: How to Trade Property Tokens P2P Before Maturity',
    category: 'Guides & Education',
    excerpt: 'Need liquidity before a project completes? Discover how the decentralized secondary market bulletin board enables frictionless P2P token transfers.',
    readTime: '5 min read',
    publishedAt: '2025-11-12',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=85',
    tags: ['Secondary Market', 'Liquidity', 'P2P', 'Trading', 'Polygon'],
    author: {
      name: 'Elena Rostova',
      role: 'Senior Portfolio Strategist',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    },
    content: `
Traditional real estate requires months of listing, brokerage commissions (often 3% to 5%), notary appointments, and lengthy mortgage underwriting before an owner can liquidate. Tokenization introduces instant secondary market liquidity without disrupting the underlying property.

### How the Secondary Bulletin Board Operates
1. **Listing Your Tokens:** An investor holding tokens in a project (for example, *Valencia 4 Ruzafa*) who wants immediate liquidity can list any number of tokens for sale on the platform's internal peer-to-peer bulletin board.
2. **Pricing Freedom:** Sellers can offer their tokens at par value (€100 per token) or apply a premium/discount based on accumulated rental yields or impending project exit.
3. **Smart Contract Settlement:** Once a verified buyer accepts the offer, the atomic swap executes automatically via audited smart contracts on Polygon. Funds transfer instantly to the seller's balance, and token legal rights transfer to the buyer.
4. **Automated Register Update:** The issuing SPV ledger updates in real time, guaranteeing that the next monthly dividend will be seamlessly routed to the new token holder.
    `,
  },
  {
    id: 'post-due-diligence-checklist',
    slug: 'due-diligence-15-point-checklist-underwriting-properties',
    title: 'Underwriting Excellence: The 15-Point Due Diligence Checklist for Spanish Properties',
    category: 'Market Insights',
    excerpt: 'Only 1 out of every 100 examined properties passes our institutional screening. Discover the exact criteria our analysts audit before tokenizing an asset.',
    readTime: '7 min read',
    publishedAt: '2025-10-20',
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=85',
    tags: ['Due Diligence', 'Underwriting', 'RICS', 'Safety', 'Audit'],
    author: {
      name: 'Adrián Fariza',
      role: 'Head of Real Estate Analytics',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    },
    content: `
High returns are meaningless without ironclad downside protection. To maintain our flawless 0% default rate across more than 120 completed projects, every asset undergoes an exhaustive 15-point technical, legal, and financial audit.

### The 3 Core Pillars of Our Audit:

#### I. Legal & Urban Planning (Urbanismo y Registro)
- **Nota Simple Informativa:** Full encumbrance check confirming clean title with zero liens, mortgage burdens, or embargoes.
- **Licencia Urbanística:** Verification that municipal zoning permits residential living, holiday leasing, or architectural division.
- **Comunidad de Propietarios:** Confirmation that community statutes do not prohibit tourist rentals or specific layout modifications.

#### II. Technical & Architectural (Inspección Técnica)
- **Structural Integrity:** Independent architectural inspection checking load-bearing walls, foundations, dampness, and electrical installations.
- **Energy Certification:** Upgrading the Energy Efficiency Certificate (CEE) from D/E to A/B during renovation to unlock green premium sales pricing.
- **Fixed-Price Contractor Bidding:** All refurbishment contracts are signed under a guaranteed maximum price (Precio Cerrado) with penalty clauses for delays.

#### III. Financial Underwriting & Stress Testing
- **RICS Independent Appraisal:** Third-party valuation conducted by an accredited European appraisal firm (Tinsa, Sociedad de Tasación, or Savills).
- **Stress-Test Scenarios:** Financial modeling verifying that the project remains profitable even in the event of a 10% market correction or a 4-month sale delay.
- **Clear Exit Liquidity:** Ensuring strong local and international buyer demand exists within the immediate 500-meter radius before committing capital.
    `,
  },
];
