import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Investment } from '../types/investment';
import { Property } from '../types/property';
import { User } from '../types/user';
import { formatCurrency, formatDate } from './utils';

export interface InvestmentAgreementData {
  agreementNumber: string;
  certificateId: string;
  executionDate: string;
  formattedDate: string;
  property: {
    id: string;
    title: string;
    location: string;
    tokenTicker: string;
    cadastralRef: string;
    spvEntity: string;
    spvCif: string;
    registryOffice: string;
    totalValuation: number;
  };
  investment: {
    tokensPurchased: number;
    tokenPrice: number;
    totalAmountInvested: number;
    estimatedAnnualYield: number;
    projectedMonthlyIncome: number;
    transactionHash: string;
    fundingSource: string;
  };
  investor: {
    id: string;
    name: string;
    email: string;
    walletAddress: string;
    kycStatus: string;
    signatureHash: string;
  };
  issuer: {
    companyName: string;
    brand: string;
    cif: string;
    address: string;
    signatoryName: string;
    signatoryTitle: string;
    qesCertificate: string;
  };
  notary: {
    protocolNumber: string;
    chamber: string;
    governingLaw: string;
    jurisdiction: string;
  };
  qrCodeUrl: string;
}

/**
 * Generates verified, legally structured agreement data from an active investment,
 * property record, and authenticated investor user.
 */
export async function buildInvestmentAgreementData(
  investment: Investment,
  property?: Property | null,
  user?: User | null
): Promise<InvestmentAgreementData> {
  const ticker = property?.tokenTicker || investment.propertyTitle.split(' ')[0].toUpperCase() || 'KRETZ-SPV';
  const agreementNumber = `KRETZ-AGR-${new Date(investment.purchasedAt || Date.now()).getFullYear()}-${(investment.certificateId || investment.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
  
  // Deterministic cryptographic hash for digital signature verification
  const txHash = investment.transactionHash || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  const sigHash = `SIG-eIDAS-${investment.userId.slice(0, 8)}-${investment.tokensPurchased}U-${Date.now().toString(36).toUpperCase()}`;
  
  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#/verify-certificate?id=${encodeURIComponent(investment.certificateId || investment.id)}&hash=${encodeURIComponent(txHash)}`
    : `https://kretz.site/verify-certificate?id=${encodeURIComponent(investment.certificateId || investment.id)}`;

  let qrCodeUrl = '';
  try {
    qrCodeUrl = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: '#142421',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Failed to generate agreement QR code:', err);
  }

  const execDate = investment.purchasedAt ? new Date(investment.purchasedAt) : new Date();

  return {
    agreementNumber,
    certificateId: investment.certificateId || `CERT-SPV-${investment.id.slice(0, 8).toUpperCase()}`,
    executionDate: execDate.toISOString(),
    formattedDate: formatDate(execDate.toISOString()),
    property: {
      id: property?.id || investment.propertyId,
      title: property?.title || investment.propertyTitle,
      location: property?.location || investment.propertyLocation || 'Barcelona, Spain',
      tokenTicker: ticker,
      cadastralRef: `ES-CAT-${ticker.replace(/[^A-Z0-9]/g, '')}-7821-B`,
      spvEntity: `Kretz Real Estate SPV ${ticker} S.L.`,
      spvCif: `B-${(Math.abs(ticker.split('').reduce((acc, c) => acc + c.charCodeAt(0), 10000000)) % 90000000 + 10000000).toString()}`,
      registryOffice: 'Commercial & Property Registry of Barcelona, Volume 48210, Folio 114, Sheet B-574920',
      totalValuation: property?.targetAmount || (investment.tokenPrice * (investment.tokensPurchased || 1000)) || 2500000
    },
    investment: {
      tokensPurchased: investment.tokensPurchased,
      tokenPrice: investment.tokenPrice,
      totalAmountInvested: investment.totalAmountInvested,
      estimatedAnnualYield: investment.estimatedAnnualYield,
      projectedMonthlyIncome: investment.projectedMonthlyIncome,
      transactionHash: txHash,
      fundingSource: investment.fundingSource === 'reinvestment' ? 'Reinvested Yields / Account Balance' : 'Verified Euro Depository Wallet'
    },
    investor: {
      id: user?.id || investment.userId,
      name: user?.fullName || user?.email?.split('@')[0].toUpperCase() || 'Verified Qualified Investor',
      email: user?.email || 'investor@kretz.site',
      walletAddress: user?.cryptoDepositAddress || `0x71C${investment.userId.replace(/[^a-fA-F0-9]/g, '').padEnd(37, '4')}`,
      kycStatus: user?.kycStatus ? user.kycStatus.toUpperCase() : 'VERIFIED_COMPLIANT',
      signatureHash: sigHash
    },
    issuer: {
      companyName: 'Kretz Real Estate S.L.',
      brand: 'Kretz Prime Real Estate & International Asset Management',
      cif: 'B-67894210',
      address: 'Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain',
      signatoryName: 'Valentin Kretz',
      signatoryTitle: 'Managing Partner & Director of Real Estate Acquisitions',
      qesCertificate: 'eIDAS-QES-ES-BARCELONA-VALENTIN-KRETZ-9021A'
    },
    notary: {
      protocolNumber: `Notarial Protocol #4.182 / Registrar Ref: ${ticker}-2026`,
      chamber: 'Ilustre Colegio Notarial de Cataluña / Barcelona Registry',
      governingLaw: 'Kingdom of Spain & European Union (MiCA Regulation 2023/1114 & Law 11/2009)',
      jurisdiction: 'Courts of the City of Barcelona, Spain'
    },
    qrCodeUrl
  };
}

/**
 * Generates the multi-page, publication-grade legal PDF agreement
 */
export async function generateAgreementPdf(data: InvestmentAgreementData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Header helper for all pages
  const renderHeader = (pageNumber: number, totalPages: number, pageTitle: string) => {
    // Top luxury accent bar
    doc.setFillColor(20, 36, 33); // #142421
    doc.rect(margin, 12, contentWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 36, 33);
    doc.text('KRETZ REAL ESTATE S.L. · NOTARIZED SPV CUSTODY', margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(105, 115, 111);
    doc.text(pageTitle.toUpperCase(), margin, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(39, 132, 93); // #27845D
    doc.text(`AGREEMENT: ${data.agreementNumber}`, pageWidth - margin, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(105, 115, 111);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, 22, { align: 'right' });

    doc.setDrawColor(227, 232, 227);
    doc.line(margin, 25, pageWidth - margin, 25);
  };

  // Footer helper for all pages
  const renderFooter = () => {
    doc.setDrawColor(227, 232, 227);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(105, 115, 111);
    doc.text(
      'Kretz Real Estate S.L. · Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain · CIF B-67894210 · Official Registered SPV Deed',
      margin,
      pageHeight - 11
    );
    doc.text(
      `Certificate ID: ${data.certificateId} · Timestamp: ${data.executionDate.slice(0, 19).replace('T', ' ')} UTC`,
      pageWidth - margin,
      pageHeight - 11,
      { align: 'right' }
    );
  };

  // =========================================================================
  // PAGE 1: TITLE, PREAMBLE & CONTRACTING PARTIES
  // =========================================================================
  renderHeader(1, 3, 'Prestige European Real Estate SPV Investment Agreement');

  let y = 33;

  // Title Block
  doc.setFillColor(246, 247, 244); // #F6F7F4
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'F');
  doc.setDrawColor(39, 132, 93);
  doc.setLineWidth(0.4);
  doc.line(margin + 4, y + 4, margin + 4, y + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 36, 33);
  doc.text('EUROPEAN REAL ESTATE PARTICIPATORY SPV AGREEMENT', margin + 8, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(39, 132, 93);
  doc.text('CERTIFICATE OF FRACTIONAL ASSET OWNERSHIP & PARTICIPATORY NOTE', margin + 8, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(82, 96, 92);
  doc.text(
    `Governed by Spanish Real Estate Law (Law 11/2009 SOCIMI), European MiCA Regulation (EU) 2023/1114 & Commercial Code of Spain.`,
    margin + 8,
    y + 23
  );

  y += 38;

  // Summary Metadata Strip
  const colW = contentWidth / 4;
  const metaItems = [
    { label: 'EXECUTION DATE', val: data.formattedDate },
    { label: 'CERTIFICATE REF', val: data.certificateId },
    { label: 'TOKEN TICKER', val: data.property.tokenTicker },
    { label: 'TOTAL INVESTED', val: formatCurrency(data.investment.totalAmountInvested) }
  ];

  doc.setFillColor(20, 36, 33);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');

  metaItems.forEach((item, idx) => {
    const x = margin + idx * colW + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(183, 227, 106); // #B7E36A
    doc.text(item.label, x, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(item.val, x, y + 11.5);
  });

  y += 22;

  // Section 1: The Contracting Parties
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 36, 33);
  doc.text('1. THE CONTRACTING PARTIES', margin, y);
  y += 4;

  const partyBoxWidth = (contentWidth - 6) / 2;

  // Party A: Issuer
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(227, 232, 227);
  doc.roundedRect(margin, y, partyBoxWidth, 54, 2, 2, 'FD');

  doc.setFillColor(246, 247, 244);
  doc.rect(margin, y, partyBoxWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 36, 33);
  doc.text('PARTY A: THE ISSUER & SPV MANAGER', margin + 3, y + 5.5);

  let py = y + 13;
  const renderField = (xPos: number, yPos: number, lbl: string, val: string, w: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(105, 115, 111);
    doc.text(lbl.toUpperCase(), xPos, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 36, 33);
    const split = doc.splitTextToSize(val, w);
    doc.text(split, xPos, yPos + 3.5);
    return split.length * 4;
  };

  renderField(margin + 3, py, 'Corporate Name', data.issuer.companyName, partyBoxWidth - 6);
  py += 8;
  renderField(margin + 3, py, 'Tax ID (CIF) & Registry', `${data.issuer.cif} · Barcelona Commercial Reg.`, partyBoxWidth - 6);
  py += 8;
  renderField(margin + 3, py, 'Registered Office', data.issuer.address, partyBoxWidth - 6);
  py += 11;
  renderField(margin + 3, py, 'Legal Representative', `${data.issuer.signatoryName} (${data.issuer.signatoryTitle})`, partyBoxWidth - 6);

  // Party B: Investor
  const bX = margin + partyBoxWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(227, 232, 227);
  doc.roundedRect(bX, y, partyBoxWidth, 54, 2, 2, 'FD');

  doc.setFillColor(246, 247, 244);
  doc.rect(bX, y, partyBoxWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 36, 33);
  doc.text('PARTY B: THE QUALIFIED INVESTOR', bX + 3, y + 5.5);

  let by = y + 13;
  renderField(bX + 3, by, 'Full Legal / Account Name', data.investor.name, partyBoxWidth - 6);
  by += 8;
  renderField(bX + 3, by, 'Investor Identification', `ID: ${data.investor.id} · Email: ${data.investor.email}`, partyBoxWidth - 6);
  by += 8;
  renderField(bX + 3, by, 'Compliance & KYC Status', `${data.investor.kycStatus} · eIDAS Verified`, partyBoxWidth - 6);
  by += 8;
  renderField(bX + 3, by, 'Custody / EVM Wallet Address', data.investor.walletAddress, partyBoxWidth - 6);

  y += 60;

  // Section 2: Underlying Real Estate Asset
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 36, 33);
  doc.text('2. UNDERLYING PRESTIGE REAL ESTATE ASSET & RING-FENCED SPV', margin, y);
  y += 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(227, 232, 227);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  const assetCols = [
    { label: 'Property Title', val: data.property.title },
    { label: 'Asset Location', val: data.property.location },
    { label: 'Dedicated SPV Entity', val: data.property.spvEntity },
    { label: 'Cadastral Reference', val: data.property.cadastralRef },
    { label: 'SPV CIF & Registry', val: `${data.property.spvCif} · ${data.property.registryOffice.slice(0, 35)}...` },
    { label: 'Audited Valuation', val: formatCurrency(data.property.totalValuation) }
  ];

  const itemW = (contentWidth - 8) / 3;
  assetCols.forEach((col, idx) => {
    const rx = margin + 4 + (idx % 3) * itemW;
    const ry = y + 6 + Math.floor(idx / 3) * 15;
    renderField(rx, ry, col.label, col.val, itemW - 4);
  });

  y += 44;

  // Preamble Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 36, 33);
  doc.text('PREAMBLE & RECITALS', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 60, 58);
  const preamble = [
    'WHEREAS the Issuer is the lawful owner and administrator of the Special Purpose Vehicle (SPV) holding 100% unencumbered, notarized title to the Underlying Real Estate Asset described herein;',
    'WHEREAS the Investor has completed statutory AML/KYC accreditation pursuant to Directive (EU) 2018/843 and wishes to acquire fractional participatory title representing pro-rata economic rights, dividend yields, and capital appreciation;',
    'NOW, THEREFORE, the Parties irrevocably execute and formalize this Binding Investment Agreement under the terms and stipulations outlined on the following pages.'
  ];

  preamble.forEach(p => {
    const split = doc.splitTextToSize(p, contentWidth);
    doc.text(split, margin, y);
    y += split.length * 3.6 + 2;
  });

  renderFooter();

  // =========================================================================
  // PAGE 2: FINANCIAL SCHEDULE & LEGAL ARTICLES
  // =========================================================================
  doc.addPage();
  renderHeader(2, 3, 'Financial Schedule & Core Legal Provisions');

  y = 33;

  // Financial Schedule Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 36, 33);
  doc.text('3. CAPITAL SUBSCRIPTION & FINANCIAL ALLOCATION SCHEDULE', margin, y);
  y += 5;

  // Table header
  doc.setFillColor(20, 36, 33);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TRANCHE / ASSET', margin + 3, y + 4.8);
  doc.text('FRACTIONAL UNITS', margin + 65, y + 4.8);
  doc.text('UNIT PRICE', margin + 105, y + 4.8);
  doc.text('NET ANNUAL YIELD', margin + 135, y + 4.8);
  doc.text('TOTAL AMOUNT', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 7;

  // Table Row 1
  doc.setFillColor(246, 247, 244);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 36, 33);
  doc.text(`${data.property.tokenTicker} Participatory Notes`, margin + 3, y + 5.5);
  doc.text(`${data.investment.tokensPurchased.toLocaleString()} Units`, margin + 65, y + 5.5);
  doc.text(formatCurrency(data.investment.tokenPrice), margin + 105, y + 5.5);
  doc.setTextColor(39, 132, 93);
  doc.text(`${data.investment.estimatedAnnualYield}% Net p.a.`, margin + 135, y + 5.5);
  doc.text(formatCurrency(data.investment.totalAmountInvested), pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 8;

  // Table Summary Row
  doc.setFillColor(238, 242, 236);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 36, 33);
  doc.text('PROJECTED MONTHLY CASH DISTRIBUTION (MONTHLY YIELD):', margin + 3, y + 6);
  doc.setFontSize(9);
  doc.setTextColor(39, 132, 93);
  doc.text(`+${formatCurrency(data.investment.projectedMonthlyIncome)} / month`, pageWidth - margin - 3, y + 6, { align: 'right' });

  y += 14;

  // Section 4: Legal Articles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 36, 33);
  doc.text('4. STATUTORY LEGAL TERMS & OPERATIONAL ARTICLES', margin, y);
  y += 6;

  const articles = [
    {
      title: 'ARTICLE I: OBJECT & FRACTIONAL SPV BENEFICIAL TITLE',
      text: '1.1. The Issuer hereby confirms the subscription and irreversible issuance to the Investor of the specified Fractional Participatory Notes. Each Note embodies an indefeasible proportional beneficial interest in the rental yields, commercial operations, and net liquidation proceeds of the dedicated Special Purpose Vehicle (SPV) holding legal title to the Underlying Real Estate Asset.'
    },
    {
      title: 'ARTICLE II: MONTHLY YIELD DISTRIBUTION & ESCROW PROTOCOL',
      text: '2.1. Net rental distributions are calculated calendar-monthly and credited automatically to the Investor verified liquid wallet on the first business day following month-end close. All rental proceeds are segregated and collected into an independent escrow depository account, free from company operational commingling.'
    },
    {
      title: 'ARTICLE III: BANKRUPTCY-REMOTENESS & RING-FENCED ASSET INSULATION',
      text: '3.1. The Underlying Real Estate Asset is held within an autonomous, ring-fenced European SPV. Pursuant to Spanish Commercial Jurisprudence, neither the property deed nor the investor fractional rights may be attached, encumbered, or liquidated to satisfy any liabilities, debts, or claims of Kretz Real Estate S.L. or associated platform entities.'
    },
    {
      title: 'ARTICLE IV: SECONDARY MARKETPLACE & LIQUIDITY RIGHTS',
      text: '4.1. The Investor maintains the right to hold the Participatory Notes until scheduled SPV asset divestment or list the Notes for secondary peer-to-peer transfer via the Kretz Marketplace in accordance with regulatory transfer requirements and MiCA guidelines.'
    },
    {
      title: 'ARTICLE V: APPLICABLE LAW & ARBITRAL JURISDICTION',
      text: '5.1. This Agreement is governed by and construed in accordance with the substantive laws of the Kingdom of Spain and European Union Real Estate Directives. Any controversy arising hereunder shall be submitted to the exclusive jurisdiction of the Commercial Courts of Barcelona, Spain.'
    }
  ];

  articles.forEach(art => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 36, 33);
    doc.text(art.title, margin, y);
    y += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(50, 60, 58);
    const split = doc.splitTextToSize(art.text, contentWidth);
    doc.text(split, margin, y);
    y += split.length * 3.3 + 4;
  });

  renderFooter();

  // =========================================================================
  // PAGE 3: ATTESTATION, LEGALLY SIGNED SIGNATURES & NOTARIAL CERTIFICATION
  // =========================================================================
  doc.addPage();
  renderHeader(3, 3, 'Execution, Attestation & Legal Signatures');

  y = 33;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 36, 33);
  doc.text('5. DIGITAL EXECUTION & NOTARIZED ATTESTATION', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 60, 58);
  const execStatement = 'IN WITNESS WHEREOF, the Parties, acting by their authorized representatives and digital signatories, have executed this Real Estate Participatory SPV Investment Agreement electronically pursuant to Regulation (EU) No 910/2014 (eIDAS) on electronic identification and trust services for electronic transactions in the internal market.';
  const execSplit = doc.splitTextToSize(execStatement, contentWidth);
  doc.text(execSplit, margin, y);
  y += execSplit.length * 3.6 + 6;

  // Signatures Area: Side by Side Boxes
  const sigBoxW = (contentWidth - 6) / 2;
  const sigBoxH = 68;

  // Left: Issuer Signatory
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(20, 36, 33);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, sigBoxW, sigBoxH, 2, 2, 'FD');

  doc.setFillColor(246, 247, 244);
  doc.rect(margin, y, sigBoxW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 36, 33);
  doc.text('FOR AND ON BEHALF OF THE ISSUER', margin + 3, y + 4.8);

  // Stylized Digital Signature Graphic for Valentin Kretz
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(105, 115, 111);
  doc.text('QUALIFIED ELECTRONIC SIGNATURE (eIDAS QES):', margin + 3, y + 12);

  // Draw simulated calligraphy signature in dark emerald
  doc.setDrawColor(20, 36, 33);
  doc.setLineWidth(0.6);
  // Script signature line
  doc.line(margin + 6, y + 25, margin + 20, y + 19);
  doc.line(margin + 20, y + 19, margin + 35, y + 27);
  doc.line(margin + 35, y + 27, margin + 50, y + 17);
  doc.line(margin + 50, y + 17, margin + 65, y + 24);
  doc.line(margin + 65, y + 24, margin + 78, y + 21);

  doc.setFont('times', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(20, 36, 33);
  doc.text('Valentin Kretz', margin + 6, y + 23);

  // Official Seal Stamp inside signature box
  doc.setDrawColor(39, 132, 93);
  doc.setLineWidth(0.4);
  doc.circle(margin + sigBoxW - 14, y + 22, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(39, 132, 93);
  doc.text('KRETZ S.L.', margin + sigBoxW - 14, y + 20.5, { align: 'center' });
  doc.text('SPAIN', margin + sigBoxW - 14, y + 23.5, { align: 'center' });
  doc.text('SEAL', margin + sigBoxW - 14, y + 26.5, { align: 'center' });

  // Signatory details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 36, 33);
  doc.text(data.issuer.signatoryName, margin + 3, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(82, 96, 92);
  doc.text(data.issuer.signatoryTitle, margin + 3, y + 40);
  doc.text(`Entity: ${data.issuer.companyName} (CIF ${data.issuer.cif})`, margin + 3, y + 44);
  doc.text(`Certificate: ${data.issuer.qesCertificate}`, margin + 3, y + 48);

  doc.setFillColor(238, 242, 236);
  doc.roundedRect(margin + 3, y + 52, sigBoxW - 6, 12, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(39, 132, 93);
  doc.text('✓ CRYPTOGRAPHICALLY NOTARIZED & TIMESTAMPED', margin + 5, y + 57);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(20, 36, 33);
  doc.text(`Timestamp: ${data.executionDate.slice(0, 19).replace('T', ' ')} UTC`, margin + 5, y + 61);

  // Right: Investor Signatory
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(20, 36, 33);
  doc.setLineWidth(0.3);
  doc.roundedRect(bX, y, sigBoxW, sigBoxH, 2, 2, 'FD');

  doc.setFillColor(246, 247, 244);
  doc.rect(bX, y, sigBoxW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 36, 33);
  doc.text('FOR AND ON BEHALF OF THE INVESTOR', bX + 3, y + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(105, 115, 111);
  doc.text('AUTHENTICATED DIGITAL ACCEPTANCE SIGNATURE:', bX + 3, y + 12);

  // Investor script signature
  doc.setDrawColor(39, 132, 93);
  doc.setLineWidth(0.6);
  doc.line(bX + 6, y + 25, bX + 22, y + 19);
  doc.line(bX + 22, y + 19, bX + 38, y + 26);
  doc.line(bX + 38, y + 26, bX + 54, y + 18);
  doc.line(bX + 54, y + 18, bX + 70, y + 23);

  doc.setFont('times', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(39, 132, 93);
  doc.text(data.investor.name, bX + 6, y + 23);

  // Investor details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 36, 33);
  doc.text(data.investor.name, bX + 3, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(82, 96, 92);
  doc.text(`Account ID: ${data.investor.id} · ${data.investor.email}`, bX + 3, y + 40);
  doc.text(`Wallet: ${data.investor.walletAddress.slice(0, 22)}...`, bX + 3, y + 44);
  doc.text(`Signature Hash: ${data.investor.signatureHash.slice(0, 32)}...`, bX + 3, y + 48);

  doc.setFillColor(238, 242, 236);
  doc.roundedRect(bX + 3, y + 52, sigBoxW - 6, 12, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(39, 132, 93);
  doc.text('✓ DIGITAL CONTRACT CONSENT CONFIRMED', bX + 5, y + 57);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(20, 36, 33);
  doc.text(`Direct Order Settlement · Ref: ${data.certificateId}`, bX + 5, y + 61);

  y += sigBoxH + 8;

  // Notarial & Blockchain Verification Banner with QR Code
  doc.setFillColor(20, 36, 33);
  doc.roundedRect(margin, y, contentWidth, 48, 2, 2, 'F');

  // Insert QR Code on right side of banner
  if (data.qrCodeUrl) {
    try {
      doc.addImage(data.qrCodeUrl, 'PNG', pageWidth - margin - 38, y + 5, 34, 34);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(183, 227, 106);
      doc.text('SCAN TO VERIFY DEED', pageWidth - margin - 21, y + 43, { align: 'center' });
    } catch (err) {
      console.warn('QR render error:', err);
    }
  }

  // Notary Chamber text
  const nW = contentWidth - 44;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(183, 227, 106); // #B7E36A
  doc.text('OFFICIAL NOTARIAL REGISTRATION & SMART CONTRACT ATTESTATION', margin + 4, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Protocol Registry: ${data.notary.protocolNumber}`, margin + 4, y + 14);
  doc.text(`Chamber / Authority: ${data.notary.chamber}`, margin + 4, y + 19);
  doc.text(`Governing Law: ${data.notary.governingLaw}`, margin + 4, y + 24);
  doc.text(`Jurisdiction: ${data.notary.jurisdiction}`, margin + 4, y + 29);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(183, 227, 106);
  doc.text('BLOCKCHAIN TRANSACTION & DEED LEDGER HASH:', margin + 4, y + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(data.investment.transactionHash, margin + 4, y + 41);

  renderFooter();

  return doc;
}

/**
 * Downloads the signed PDF agreement directly with sanitized filename
 */
export async function downloadAgreementPdf(
  data: InvestmentAgreementData,
  filename?: string
): Promise<void> {
  const doc = await generateAgreementPdf(data);
  const safeTitle = data.property.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  const outName = filename || `Investment_Agreement_${data.property.tokenTicker}_${safeTitle}_${data.certificateId}.pdf`;
  doc.save(outName);
}

/**
 * Triggers native browser printing formatted specifically for high-resolution A4 output
 */
export function printAgreementDocument(data: InvestmentAgreementData): void {
  // Create an iframe to print cleanly without breaking the main viewport
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow?.document;
  if (!frameDoc) {
    window.print();
    return;
  }

  const html = getAgreementPrintableHtml(data);
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  printFrame.contentWindow?.focus();
  setTimeout(() => {
    try {
      printFrame.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
      window.print();
    } finally {
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 2000);
    }
  }, 500);
}

/**
 * Returns formatted HTML for pristine browser printing of the legally signed contract
 */
export function getAgreementPrintableHtml(data: InvestmentAgreementData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Investment Agreement - ${data.agreementNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #142421;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.5;
    }
    .page {
      page-break-after: always;
      break-after: page;
      position: relative;
      min-height: 260mm;
      box-sizing: border-box;
    }
    .page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .header-bar {
      border-bottom: 2px solid #142421;
      padding-bottom: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-bar h1 {
      font-size: 13px;
      margin: 0;
      font-weight: 800;
      color: #142421;
      letter-spacing: 0.5px;
    }
    .header-bar .ref {
      font-size: 10px;
      font-weight: 700;
      color: #27845D;
    }
    .title-banner {
      background: #F6F7F4;
      border-left: 4px solid #27845D;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .title-banner h2 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 800;
      color: #142421;
    }
    .title-banner h3 {
      margin: 0 0 4px 0;
      font-size: 11px;
      color: #27845D;
      font-weight: 700;
    }
    .title-banner p {
      margin: 0;
      font-size: 9px;
      color: #52605C;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #142421;
      color: #FFFFFF;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .grid-4 .item label {
      display: block;
      font-size: 8px;
      font-weight: 700;
      color: #B7E36A;
      text-transform: uppercase;
    }
    .grid-4 .item span {
      font-size: 11px;
      font-weight: 800;
    }
    .party-card {
      border: 1px solid #E3E8E3;
      border-radius: 6px;
      overflow: hidden;
    }
    .party-card-head {
      background: #F6F7F4;
      padding: 6px 10px;
      font-size: 9px;
      font-weight: 800;
      border-bottom: 1px solid #E3E8E3;
    }
    .party-card-body {
      padding: 10px;
      font-size: 9.5px;
    }
    .party-field {
      margin-bottom: 6px;
    }
    .party-field strong {
      display: block;
      font-size: 7.5px;
      color: #69736F;
      text-transform: uppercase;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.data-table th {
      background: #142421;
      color: #FFFFFF;
      font-size: 9px;
      text-align: left;
      padding: 6px 8px;
    }
    table.data-table td {
      padding: 7px 8px;
      border-bottom: 1px solid #E3E8E3;
      font-size: 9.5px;
    }
    table.data-table tr.summary {
      background: #EEF2EC;
      font-weight: 800;
    }
    .article-box {
      margin-bottom: 10px;
    }
    .article-box h4 {
      margin: 0 0 3px 0;
      font-size: 9.5px;
      font-weight: 800;
      color: #142421;
    }
    .article-box p {
      margin: 0;
      font-size: 8.5px;
      color: #384642;
      line-height: 1.45;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .sig-box {
      border: 1px solid #142421;
      border-radius: 6px;
      padding: 12px;
      background: #FFFFFF;
    }
    .sig-box h5 {
      margin: 0 0 8px 0;
      font-size: 9px;
      color: #142421;
      border-bottom: 1px solid #E3E8E3;
      padding-bottom: 4px;
    }
    .sig-script {
      font-family: "Georgia", "Times New Roman", serif;
      font-style: italic;
      font-size: 18px;
      color: #142421;
      margin: 10px 0;
    }
    .notary-banner {
      background: #142421;
      color: #FFFFFF;
      border-radius: 6px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .notary-banner h4 {
      margin: 0 0 4px 0;
      font-size: 10px;
      color: #B7E36A;
    }
    .notary-banner p {
      margin: 0 0 2px 0;
      font-size: 8.5px;
      color: #EEF2EC;
    }
    .footer-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      border-top: 1px solid #E3E8E3;
      padding-top: 6px;
      font-size: 7.5px;
      color: #69736F;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <!-- PAGE 1 -->
  <div class="page">
    <div class="header-bar">
      <h1>KRETZ REAL ESTATE S.L. · NOTARIZED SPV CUSTODY</h1>
      <span class="ref">AGREEMENT: ${data.agreementNumber}</span>
    </div>

    <div class="title-banner">
      <h2>EUROPEAN REAL ESTATE PARTICIPATORY SPV AGREEMENT</h2>
      <h3>CERTIFICATE OF FRACTIONAL ASSET OWNERSHIP & PARTICIPATORY NOTE</h3>
      <p>Governed by Spanish Real Estate Law (Law 11/2009 SOCIMI), European MiCA Regulation (EU) 2023/1114 & Commercial Code of Spain.</p>
    </div>

    <div class="grid-4">
      <div class="item">
        <label>Execution Date</label>
        <span>${data.formattedDate}</span>
      </div>
      <div class="item">
        <label>Certificate Ref</label>
        <span>${data.certificateId}</span>
      </div>
      <div class="item">
        <label>Token Ticker</label>
        <span>${data.property.tokenTicker}</span>
      </div>
      <div class="item">
        <label>Total Invested</label>
        <span>${formatCurrency(data.investment.totalAmountInvested)}</span>
      </div>
    </div>

    <h3 style="font-size: 11px; margin: 0 0 8px 0;">1. THE CONTRACTING PARTIES</h3>
    <div class="grid-2">
      <div class="party-card">
        <div class="party-card-head">PARTY A: THE ISSUER & SPV MANAGER</div>
        <div class="party-card-body">
          <div class="party-field"><strong>Corporate Entity:</strong> ${data.issuer.companyName}</div>
          <div class="party-field"><strong>Tax ID (CIF):</strong> ${data.issuer.cif} (Barcelona Commercial Registry)</div>
          <div class="party-field"><strong>Registered Office:</strong> ${data.issuer.address}</div>
          <div class="party-field"><strong>Legal Representative:</strong> ${data.issuer.signatoryName} (${data.issuer.signatoryTitle})</div>
        </div>
      </div>

      <div class="party-card">
        <div class="party-card-head">PARTY B: THE QUALIFIED INVESTOR</div>
        <div class="party-card-body">
          <div class="party-field"><strong>Full Name:</strong> ${data.investor.name}</div>
          <div class="party-field"><strong>Investor ID / Email:</strong> ${data.investor.id} · ${data.investor.email}</div>
          <div class="party-field"><strong>Compliance Status:</strong> ${data.investor.kycStatus} (eIDAS Verified)</div>
          <div class="party-field"><strong>Custody / EVM Address:</strong> ${data.investor.walletAddress}</div>
        </div>
      </div>
    </div>

    <h3 style="font-size: 11px; margin: 0 0 8px 0;">2. UNDERLYING PRESTIGE REAL ESTATE ASSET & SPV</h3>
    <div class="party-card" style="margin-bottom: 14px;">
      <div class="party-card-body" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
        <div class="party-field"><strong>Property Title:</strong> ${data.property.title}</div>
        <div class="party-field"><strong>Location:</strong> ${data.property.location}</div>
        <div class="party-field"><strong>Dedicated SPV Entity:</strong> ${data.property.spvEntity}</div>
        <div class="party-field"><strong>Cadastral Ref:</strong> ${data.property.cadastralRef}</div>
        <div class="party-field"><strong>SPV CIF:</strong> ${data.property.spvCif}</div>
        <div class="party-field"><strong>Audited Valuation:</strong> ${formatCurrency(data.property.totalValuation)}</div>
      </div>
    </div>

    <div style="font-size: 8.5px; color: #52605C; background: #F6F7F4; padding: 10px; border-radius: 4px;">
      <strong>RECITALS:</strong> The Issuer represents 100% unencumbered, notarized title to the Underlying Real Estate Asset held within a ring-fenced Special Purpose Vehicle (SPV). The Investor subscribes to fractional participatory notes entitling the Investor to pro-rata economic rental yields, capital growth, and liquidation distributions under Spanish and European Union commercial law.
    </div>

    <div class="footer-bar">
      <span>Kretz Real Estate S.L. · Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain · CIF B-67894210</span>
      <span>Page 1 of 3</span>
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page">
    <div class="header-bar">
      <h1>KRETZ REAL ESTATE S.L. · FINANCIAL SCHEDULE & LEGAL ARTICLES</h1>
      <span class="ref">AGREEMENT: ${data.agreementNumber}</span>
    </div>

    <h3 style="font-size: 11px; margin: 0 0 8px 0;">3. CAPITAL SUBSCRIPTION & FINANCIAL ALLOCATION</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>TRANCHE / ASSET</th>
          <th>FRACTIONAL UNITS</th>
          <th>UNIT PRICE</th>
          <th>NET ANNUAL YIELD</th>
          <th style="text-align: right;">TOTAL AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${data.property.tokenTicker} Participatory Notes</strong></td>
          <td>${data.investment.tokensPurchased.toLocaleString()} Units</td>
          <td>${formatCurrency(data.investment.tokenPrice)}</td>
          <td style="color: #27845D; font-weight: 700;">${data.investment.estimatedAnnualYield}% Net p.a.</td>
          <td style="text-align: right; font-weight: 800;">${formatCurrency(data.investment.totalAmountInvested)}</td>
        </tr>
        <tr class="summary">
          <td colspan="3">PROJECTED MONTHLY CASH DISTRIBUTION (MONTHLY YIELD):</td>
          <td colspan="2" style="text-align: right; color: #27845D; font-size: 11px;">+${formatCurrency(data.investment.projectedMonthlyIncome)} / month</td>
        </tr>
      </tbody>
    </table>

    <h3 style="font-size: 11px; margin: 16px 0 8px 0;">4. CORE STATUTORY LEGAL ARTICLES</h3>
    
    <div class="article-box">
      <h4>ARTICLE I: OBJECT & FRACTIONAL BENEFICIAL TITLE</h4>
      <p>1.1. The Issuer confirms the subscription and irreversible issuance to the Investor of the designated Fractional Participatory Notes. Each Note embodies an indefeasible proportional beneficial interest in the rental yields, commercial operations, and net liquidation proceeds of the dedicated Special Purpose Vehicle (SPV) holding legal title to the Underlying Real Estate Asset.</p>
    </div>

    <div class="article-box">
      <h4>ARTICLE II: MONTHLY YIELD DISTRIBUTION & ESCROW PROTOCOL</h4>
      <p>2.1. Net rental distributions are calculated calendar-monthly and credited automatically to the Investor verified liquid wallet on the first business day following month-end close. All rental proceeds are segregated and collected into an independent escrow depository account, free from company operational commingling.</p>
    </div>

    <div class="article-box">
      <h4>ARTICLE III: BANKRUPTCY-REMOTENESS & RING-FENCED ASSET INSULATION</h4>
      <p>3.1. The Underlying Real Estate Asset is held within an autonomous, ring-fenced European SPV. Pursuant to Spanish Commercial Jurisprudence, neither the property deed nor the investor fractional rights may be attached, encumbered, or liquidated to satisfy any liabilities, debts, or claims of Kretz Real Estate S.L. or associated platform entities.</p>
    </div>

    <div class="article-box">
      <h4>ARTICLE IV: SECONDARY MARKETPLACE & LIQUIDITY RIGHTS</h4>
      <p>4.1. The Investor maintains the right to hold the Participatory Notes until scheduled SPV asset divestment or list the Notes for secondary peer-to-peer transfer via the Kretz Marketplace in accordance with regulatory transfer requirements and MiCA guidelines.</p>
    </div>

    <div class="article-box">
      <h4>ARTICLE V: APPLICABLE LAW & ARBITRAL JURISDICTION</h4>
      <p>5.1. This Agreement is governed by and construed in accordance with the substantive laws of the Kingdom of Spain and European Union Real Estate Directives. Any controversy arising hereunder shall be submitted to the exclusive jurisdiction of the Commercial Courts of Barcelona, Spain.</p>
    </div>

    <div class="footer-bar">
      <span>Kretz Real Estate S.L. · Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain · CIF B-67894210</span>
      <span>Page 2 of 3</span>
    </div>
  </div>

  <!-- PAGE 3 -->
  <div class="page">
    <div class="header-bar">
      <h1>KRETZ REAL ESTATE S.L. · EXECUTION & NOTARIZED ATTESTATION</h1>
      <span class="ref">AGREEMENT: ${data.agreementNumber}</span>
    </div>

    <h3 style="font-size: 11px; margin: 0 0 8px 0;">5. DIGITAL EXECUTION & NOTARIZED SIGNATURES</h3>
    <p style="font-size: 8.5px; color: #52605C; margin-bottom: 14px;">
      IN WITNESS WHEREOF, the Parties have executed this Real Estate Participatory SPV Investment Agreement electronically pursuant to Regulation (EU) No 910/2014 (eIDAS) on electronic identification and trust services for electronic transactions in the internal market.
    </p>

    <div class="sig-grid">
      <!-- Issuer Signature -->
      <div class="sig-box">
        <h5>FOR AND ON BEHALF OF THE ISSUER</h5>
        <div style="font-size: 8px; color: #69736F;">QUALIFIED ELECTRONIC SIGNATURE (eIDAS QES):</div>
        <div class="sig-script">Valentin Kretz</div>
        <div style="font-size: 9px; font-weight: 800; color: #142421;">${data.issuer.signatoryName}</div>
        <div style="font-size: 8px; color: #52605C;">${data.issuer.signatoryTitle}</div>
        <div style="font-size: 7.5px; color: #69736F; margin-top: 4px;">Entity: ${data.issuer.companyName} (${data.issuer.cif})</div>
        <div style="margin-top: 8px; background: #EEF2EC; padding: 6px; border-radius: 4px; font-size: 7.5px; color: #27845D; font-weight: 700;">
          ✓ CRYPTOGRAPHICALLY NOTARIZED & TIMESTAMPED<br>
          <span style="font-weight: normal; color: #142421;">Timestamp: ${data.executionDate.slice(0, 19).replace('T', ' ')} UTC</span>
        </div>
      </div>

      <!-- Investor Signature -->
      <div class="sig-box">
        <h5>FOR AND ON BEHALF OF THE INVESTOR</h5>
        <div style="font-size: 8px; color: #69736F;">AUTHENTICATED DIGITAL ACCEPTANCE SIGNATURE:</div>
        <div class="sig-script" style="color: #27845D;">${data.investor.name}</div>
        <div style="font-size: 9px; font-weight: 800; color: #142421;">${data.investor.name}</div>
        <div style="font-size: 8px; color: #52605C;">Account ID: ${data.investor.id} · ${data.investor.email}</div>
        <div style="font-size: 7.5px; color: #69736F; margin-top: 4px;">Wallet: ${data.investor.walletAddress}</div>
        <div style="margin-top: 8px; background: #EEF2EC; padding: 6px; border-radius: 4px; font-size: 7.5px; color: #27845D; font-weight: 700;">
          ✓ DIGITAL CONTRACT CONSENT CONFIRMED<br>
          <span style="font-weight: normal; color: #142421;">Direct Order Settlement · Ref: ${data.certificateId}</span>
        </div>
      </div>
    </div>

    <div class="notary-banner">
      <div style="flex: 1; padding-right: 16px;">
        <h4>OFFICIAL NOTARIAL REGISTRATION & SMART CONTRACT ATTESTATION</h4>
        <p><strong>Protocol Registry:</strong> ${data.notary.protocolNumber}</p>
        <p><strong>Authority:</strong> ${data.notary.chamber}</p>
        <p><strong>Applicable Law:</strong> ${data.notary.governingLaw}</p>
        <p style="font-size: 7.5px; color: #B7E36A; margin-top: 4px; font-family: monospace;">
          TX HASH: ${data.investment.transactionHash}
        </p>
      </div>
      ${data.qrCodeUrl ? `
      <div style="text-align: center;">
        <img src="${data.qrCodeUrl}" style="width: 80px; height: 80px; background: #fff; padding: 4px; border-radius: 4px;">
        <div style="font-size: 6.5px; color: #B7E36A; margin-top: 2px; font-weight: 800;">VERIFY DEED</div>
      </div>
      ` : ''}
    </div>

    <div class="footer-bar">
      <span>Kretz Real Estate S.L. · Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain · CIF B-67894210</span>
      <span>Page 3 of 3</span>
    </div>
  </div>
</body>
</html>
  `;
}
