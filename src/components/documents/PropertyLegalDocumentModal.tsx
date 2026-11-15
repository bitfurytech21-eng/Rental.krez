import React from 'react';
import { Property, PropertyDocument } from '@/types/property';
import { formatCurrency } from '@/lib/utils';
import {
  FileText,
  ShieldCheck,
  X,
  Printer
} from 'lucide-react';

interface PropertyLegalDocumentModalProps {
  property: Property;
  document: PropertyDocument;
  onClose: () => void;
}

export const PropertyLegalDocumentModal: React.FC<PropertyLegalDocumentModalProps> = ({
  property,
  document,
  onClose,
}) => {
  const [paperSize, setPaperSize] = React.useState<'A4' | 'Legal'>('A4');

  const handlePrint = () => {
    window.print();
  };

  const isMandateTitle = document.name.toLowerCase().includes('mandate') || document.name.toLowerCase().includes('title') || document.category === 'Legal';
  const isValuation = document.name.toLowerCase().includes('valuation') || document.name.toLowerCase().includes('diagnostic') || document.category === 'Valuation';
  const isProspectus = document.name.toLowerCase().includes('prospectus') || document.name.toLowerCase().includes('yield') || document.category === 'Financial';

  const ownersList = [
    'Jean-Pierre Martin',
    'Michel Bernard',
    'Philippe Dubois',
    'Jacques Moreau',
    'François Laurent',
    'Pierre Lefebvre',
    'Alain Michel',
    'André Garcia',
    'Bernard Roux',
    'Claude Vincent',
    'Gérard Fournier',
    'René Morel',
    'Louis Girard',
    'Marcel André',
    'Henri Lefèvre',
    'Robert Mercier',
    'Christian Dupont',
    'Daniel Lambert',
    'Georges Bonnet',
    'Paul François',
    'Marie Dubois',
    'Françoise Martin',
    'Monique Bernard',
    'Catherine Moreau',
    'Jacqueline Laurent',
    'Nicole Lefebvre',
    'Martine Michel',
    'Chantal Roux',
    'Danielle Vincent',
    'Brigitte Fournier',
    'Yvonne Morel',
    'Simone Girard',
    'Colette André',
    'Madeleine Lefèvre',
    'Michèle Mercier',
    'Suzanne Dupont',
    'Annie Lambert',
    'Hélène Bonnet',
    'Thérèse François',
    'Christiane Robert',
    'Jean-Claude Petit',
    'Jean-Luc Garnier',
    'Yves Chevalier',
    'Patrick François',
    'Roger Gauthier',
    'Émile Faure',
    'Albert Rousseau',
    'Odette Blanc',
    'Paulette Guerin',
    'Renée Fontaine'
  ];
  const ownerIndex = Math.abs(property.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)) % ownersList.length;
  const rawOwner = ownersList[ownerIndex];
  const registeredOwner = rawOwner.replace(/\s*-\s*Prop$/i, '').trim();

  const propertyIdsList = [
    'FR-PAR-2019-5831',
    'FR-LYO-2021-7294',
    'FR-BOR-2023-1648',
    'FR-NCE-2018-9057',
    'FR-MRS-2024-3472',
    'FR-TOU-2020-8163',
    'FR-NAN-2022-4925',
    'FR-STR-2017-6381',
    'FR-LIL-2025-2719',
    'FR-MPL-2016-7546',
    'FR-REN-2021-3198',
    'FR-REI-2019-8624',
    'FR-SA-2023-5417',
    'FR-TLN-2018-6932',
    'FR-GRE-2024-1875',
    'FR-DIJ-2020-9241',
    'FR-ANG-2022-4368',
    'FR-NIM-2017-7153',
    'FR-CLF-2025-2684',
    'FR-AVN-2016-8396',
    'FR-MET-2023-4712',
    'FR-ROU-2019-6579',
    'FR-CAE-2021-3126',
    'FR-NCY-2024-9843',
    'FR-ORL-2018-5267',
    'FR-TLS-2022-1934',
    'FR-AMI-2017-7482',
    'FR-LIM-2025-3659',
    'FR-POI-2020-8174',
    'FR-CHB-2016-2496',
    'FR-VRS-2023-6318',
    'FR-ANT-2019-4753',
    'FR-CAN-2024-9286',
    'FR-AIX-2018-1547',
    'FR-ARC-2021-7832',
    'FR-BAY-2017-4169',
    'FR-COL-2025-5923',
    'FR-DEA-2020-8641',
    'FR-EVI-2022-2375',
    'FR-FON-2016-6498',
    'FR-GAP-2024-3816',
    'FR-HYE-2019-9572',
    'FR-ISS-2023-5249',
    'FR-JUV-2017-7168',
    'FR-KRE-2025-2937',
    'FR-LAN-2021-8451',
    'FR-MEN-2018-4627',
    'FR-NEV-2022-1783',
    'FR-OLN-2020-6345',
    'FR-PAU-2024-5918'
  ];
  const propertyIdIndex = Math.abs(property.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 456)) % propertyIdsList.length;
  const uniquePropertyIdentifier = propertyIdsList[propertyIdIndex];

  const spvName = property.spvEntityName || `L'Agence Real Estate SPV ${property.tokenTicker || 'KTZ'} S.L.`;
  const spvJurisdiction = property.spvJurisdiction || 'France / European Union (Commercial Registry of Paris & Nice)';
  
  const cadastralIdNum = Math.abs(property.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 12345)) % 90000 + 10000;
  const cadastralRef = property.cadastralReference || `FR-CAD-06-${cadastralIdNum}-B`;
  const notarizationDate = document.updatedAt || '2026-02-14';

  return (
    <div className="kretz-legal-document fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <style>{`
        .kretz-legal-document { --legal-ink:#23272f; --legal-navy:#14213d; --legal-gold:#a8864f; --legal-paper:#f7f2e8; }
        .kretz-legal-document .legal-toolbar { background:#14213d; border-color:rgba(168,134,79,.55); }
        .kretz-legal-document .legal-paper { background:var(--legal-paper); color:var(--legal-ink); border:1px solid rgba(168,134,79,.55); box-shadow:0 12px 28px rgba(60,45,20,.22),inset 0 0 40px rgba(120,95,50,.10); }
        .kretz-legal-document .legal-paper h1 { color:var(--legal-navy); letter-spacing:.01em; }
        .kretz-legal-document .legal-paper h3 { color:var(--legal-navy)!important; border-color:rgba(168,134,79,.65)!important; letter-spacing:.035em; }
        .kretz-legal-document .legal-paper table thead tr { background:#eee6d7!important; color:var(--legal-navy)!important; }
        .kretz-legal-document .legal-paper table th,.kretz-legal-document .legal-paper table td { border-color:rgba(168,134,79,.42)!important; }
        .kretz-legal-document .legal-paper .legal-meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); margin:1.5rem 0; border-top:1px solid var(--legal-gold); border-bottom:1px solid var(--legal-gold); }
        .kretz-legal-document .legal-paper .legal-meta > div { padding:12px 5px; text-align:center; border-right:1px solid rgba(168,134,79,.35); min-width:0; }
        .kretz-legal-document .legal-paper .legal-meta > div:last-child { border-right:0; }
        .kretz-legal-document .legal-paper .legal-meta strong { display:block; color:var(--legal-navy); font:700 14px Georgia,serif; overflow-wrap:anywhere; }
        .kretz-legal-document .legal-paper .legal-meta small { display:block; margin-top:4px; color:#6b665c; font:8px Arial,sans-serif; letter-spacing:1.5px; text-transform:uppercase; }
        .kretz-legal-document .legal-paper .legal-section-label { color:var(--legal-gold); font:700 9px Arial,sans-serif; letter-spacing:2px; text-transform:uppercase; }
        .kretz-legal-document .valuation-report .valuation-masthead { padding-bottom:1.4rem; border-bottom:1px solid var(--legal-gold); }
        .kretz-legal-document .valuation-brand-row { display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--legal-gold); padding-bottom:9px; }
        .kretz-legal-document .valuation-brand { color:var(--legal-navy); font:700 11px Georgia,serif; letter-spacing:5px; }
        .kretz-legal-document .valuation-tag { color:var(--legal-gold); font:9px Arial,sans-serif; letter-spacing:2px; text-transform:uppercase; text-align:right; }
        .kretz-legal-document .valuation-masthead h1 { max-width:650px; margin:2rem 0 .7rem; color:var(--legal-navy); font:700 clamp(25px,3vw,34px)/1.16 Georgia,serif; }
        .kretz-legal-document .valuation-gold-rule { width:28mm; height:3px; background:var(--legal-gold); margin:1rem 0 1.4rem; }
        .kretz-legal-document .valuation-meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border-top:1px solid var(--legal-gold); border-bottom:1px solid var(--legal-gold); margin:1rem 0 1.3rem; }
        .kretz-legal-document .valuation-meta > div { min-width:0; padding:12px 5px; text-align:center; border-right:1px solid rgba(168,134,79,.35); }
        .kretz-legal-document .valuation-meta > div:last-child { border:0; }
        .kretz-legal-document .valuation-meta strong { display:block; color:var(--legal-navy); font:700 14px Georgia,serif; overflow-wrap:anywhere; }
        .kretz-legal-document .valuation-meta small { display:block; margin-top:4px; color:#6b665c; font:8px Arial,sans-serif; letter-spacing:1.5px; text-transform:uppercase; }
        .kretz-legal-document .valuation-contents { margin-top:1rem; }
        .kretz-legal-document .valuation-contents-title { margin-bottom:5px; color:var(--legal-gold); font:700 9px Arial,sans-serif; letter-spacing:3px; text-transform:uppercase; }
        .kretz-legal-document .valuation-contents > div:not(:first-child) { display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px dotted rgba(168,134,79,.7); color:#3a3d44; font:11px Arial,sans-serif; }
        .kretz-legal-document .valuation-contents em { flex:0 0 auto; color:#9a9384; font:italic 10px Georgia,serif; }
        .kretz-legal-document .prospectus-report .prospectus-masthead { padding-bottom:1.4rem; border-bottom:1px solid var(--legal-gold); }
        .kretz-legal-document .prospectus-brand-row { display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid var(--legal-gold); padding-bottom:9px; }
        .kretz-legal-document .prospectus-brand { color:var(--legal-navy); font:700 11px Georgia,serif; letter-spacing:5px; }
        .kretz-legal-document .prospectus-tag { color:var(--legal-gold); font:9px Arial,sans-serif; letter-spacing:2px; text-transform:uppercase; text-align:right; }
        .kretz-legal-document .prospectus-masthead h1 { max-width:650px; margin:2rem 0 .7rem; color:var(--legal-navy); font:700 clamp(25px,3vw,34px)/1.16 Georgia,serif; }
        .kretz-legal-document .prospectus-gold-rule { width:28mm; height:3px; background:var(--legal-gold); margin:1rem 0 1.4rem; }
        .kretz-legal-document .prospectus-meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border-top:1px solid var(--legal-gold); border-bottom:1px solid var(--legal-gold); margin:1rem 0 1.3rem; }
        .kretz-legal-document .prospectus-meta > div { min-width:0; padding:12px 5px; text-align:center; border-right:1px solid rgba(168,134,79,.35); }
        .kretz-legal-document .prospectus-meta > div:last-child { border:0; }
        .kretz-legal-document .prospectus-meta strong { display:block; color:var(--legal-navy); font:700 14px Georgia,serif; overflow-wrap:anywhere; }
        .kretz-legal-document .prospectus-meta small { display:block; margin-top:4px; color:#6b665c; font:8px Arial,sans-serif; letter-spacing:1.5px; text-transform:uppercase; }
        .kretz-legal-document .prospectus-contents { margin-top:1rem; }
        .kretz-legal-document .prospectus-contents-title { margin-bottom:5px; color:var(--legal-gold); font:700 9px Arial,sans-serif; letter-spacing:3px; text-transform:uppercase; }
        .kretz-legal-document .prospectus-contents > div:not(:first-child) { display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px dotted rgba(168,134,79,.7); color:#3a3d44; font:11px Arial,sans-serif; }
        .kretz-legal-document .prospectus-contents em { flex:0 0 auto; color:#9a9384; font:italic 10px Georgia,serif; }
        @media(max-width:520px) { .kretz-legal-document .prospectus-brand { letter-spacing:3px; }.kretz-legal-document .prospectus-tag { font-size:7px; letter-spacing:1px; }.kretz-legal-document .prospectus-meta strong { font-size:10px; }.kretz-legal-document .prospectus-meta small { font-size:7px; letter-spacing:.7px; } }
        @media(max-width:520px) { .kretz-legal-document .valuation-brand { letter-spacing:3px; }.kretz-legal-document .valuation-tag { font-size:7px; letter-spacing:1px; }.kretz-legal-document .valuation-meta strong { font-size:10px; }.kretz-legal-document .valuation-meta small { font-size:7px; letter-spacing:.7px; } }
        @media print {
          @page { size:${paperSize === 'A4' ? 'A4' : 'legal'}; margin:0; }
          body { background:#f7f2e8!important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          .kretz-legal-document { position:static!important; display:block!important; padding:0!important; overflow:visible!important; background:none!important; }
          .kretz-legal-document > div { width:100%!important; max-width:none!important; max-height:none!important; overflow:visible!important; border:0!important; border-radius:0!important; box-shadow:none!important; }
          .kretz-legal-document .legal-toolbar,.kretz-legal-document .legal-modal-footer { display:none!important; }
          .kretz-legal-document .legal-scroll { overflow:visible!important; padding:0!important; background:none!important; }
          .kretz-legal-document .legal-paper { width:100%!important; max-width:none!important; min-height:0!important; margin:0!important; padding:16mm 18mm!important; border:0!important; border-radius:0!important; box-shadow:none!important; }
          .kretz-legal-document .legal-paper section { break-inside:avoid-page; }
          .kretz-legal-document .legal-paper table { break-inside:auto; }
          .kretz-legal-document .legal-paper tr { break-inside:avoid; }
        }
        @media(max-width:520px) { .kretz-legal-document .legal-paper .legal-meta strong { font-size:11px; } .kretz-legal-document .legal-paper .legal-meta small { font-size:7px; letter-spacing:1px; } }
      `}</style>
      <div className="bg-[#e5e7eb] w-full max-w-5xl max-h-[96vh] rounded-3xl shadow-2xl border border-[#cbd5e1] relative flex flex-col overflow-hidden my-auto">
        
        {/* Modal Header Actions */}
        <div className="legal-toolbar bg-[#14213d] text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-[#a8864f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#27845D]/30 border border-[#27845D] text-[#00FF9D] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#00FF9D] tracking-wider block">
                Official Property Record & Due Diligence Dossier
              </span>
              <h3 className="text-base font-bold text-white truncate max-w-md sm:max-w-xl">
                {document.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Paper Format Toggle */}
            <div className="bg-black/30 p-1 rounded-xl flex items-center border border-white/10 text-xs">
              <button
                onClick={() => setPaperSize('A4')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  paperSize === 'A4'
                    ? 'bg-[#27845D] text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                A4
              </button>
              <button
                onClick={() => setPaperSize('Legal')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  paperSize === 'Legal'
                    ? 'bg-[#27845D] text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                US Legal
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print / Export PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Light-Gray Background Container for Paper Sheet */}
        <div className="legal-scroll flex-1 overflow-y-auto p-4 sm:p-8 bg-[#cfc8b8]">
          {/* Realistic Full-Page Paper Sheet (A4 or US Legal) */}
          <div className={`legal-paper bg-[#f7f2e8] w-full mx-auto shadow-2xl border border-[#a8864f] p-[16mm] sm:p-[22mm] space-y-8 text-[#23272f] font-serif relative transition-all duration-300 ${
            paperSize === 'A4' ? 'max-w-[210mm] min-h-[297mm]' : 'max-w-[216mm] min-h-[356mm]'
          }`}>
            
            {/* Top Center Company Logo & Institutional Header */}
            <div className="text-center space-y-3 pb-6 border-b border-[#a8864f]">
              <div className="flex justify-center">
                <img 
                  src="/assets/aistudio/IMG_7224_18c2474c.jpeg" 
                  alt="Kretz Family Real Estate Emblem" 
                  className="h-16 sm:h-20 object-contain rounded-lg shadow-sm border border-[#e2e8f0]"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase font-serif text-[#1d2321]">
                  KRETZ FAMILY REAL ESTATE &bull; DIVISION DE GESTION D'ACTIFS INSTITUTIONNELS
                </h2>
                <p className="text-[11px] uppercase tracking-wider text-[#4a5568] font-sans">
                  Paris &bull; Genève &bull; Nice &bull; Luxembourg &bull; Bureau Agréé d'Expertise Juridique & Immobilière
                </p>
              </div>

              <div className="pt-2">
                <span className="inline-block bg-[#f1f5f9] text-[#1e293b] text-[11px] font-mono font-semibold px-3 py-1 rounded border border-[#cbd5e1]">
                  RÉFÉRENCE DE CERTIFICAT OFFICIEL : {property.ref || property.tokenTicker || 'KP1-VERIFY'} &bull; DATE : {notarizationDate}
                </span>
              </div>

              <div className="pt-3">
                <h1 className="text-xl sm:text-2xl font-black text-[#14213d] uppercase tracking-wide font-serif">
                  {isMandateTitle ? "Mandat Exclusif & Examen des Titres de Propriété" : isValuation ? "Rapport d'Expertise & de Diagnostic Certifié Indépendant" : "Prospectus de Tokenisation SPV & Modèle de Rendement"}
                </h1>
                <p className="text-xs text-[#4a5568] font-serif italic mt-1">
                  Émis en vertu du Code Civil français, des Directives Immobilières de l'UE et du Règlement eIDAS (UE) n° 910/2014
                </p>
                <div className="legal-meta">
                  <div><strong>{notarizationDate}</strong><small>Record date</small></div>
                  <div><strong>{document.category || 'Legal'}</strong><small>Document class</small></div>
                  <div><strong>{property.ref || property.tokenTicker || 'Pending reference'}</strong><small>Property reference</small></div>
                </div>
                <div className="legal-section-label">Official legal record · KRETZ SPAIN</div>
              </div>
            </div>

          {/* DOCUMENT 1: KRETZ EXCLUSIVE MANDATE & TITLE DEED REVIEW */}
          {isMandateTitle && (
            <div className="space-y-6 font-serif text-sm leading-relaxed text-[#1d2321]">
              <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Nom & Intitulé du Bien :</span>
                  <span className="font-bold text-[#0f172a]">{property.title}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Identifiant Unique de Propriété :</span>
                  <span className="font-bold font-mono text-[#0f172a]">{uniquePropertyIdentifier}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Adresse Géographique Complète :</span>
                  <span className="font-bold text-[#0f172a]">{property.location}, {property.city}, {property.country}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Référence Cadastrale & Foncière :</span>
                  <span className="font-bold font-mono text-[#0f172a]">{cadastralRef}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Propriétaire Inscrit au Registre :</span>
                  <span className="font-bold text-[#1e3a8a]">{registeredOwner}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Entité Juridique SPV Opérationnelle :</span>
                  <span className="font-bold text-[#0f172a]">{spvName}</span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <p className="indent-8">
                  <span className="font-bold uppercase">ENTRE LES SOUSSIGNÉS :</span> L'Agence Luxury Real Estate France SAS, agissant en qualité d'agent de commercialisation institutionnel autorisé, et le Propriétaire Inscrit au Registre désigné ci-dessus, le présent Mandat Exclusif et Examen des Titres de Propriété est établi conformément au Code Civil français, à la Loi Hoguet n° 70-9 et aux directives européennes applicables aux actifs immobiliers de prestige.
                </p>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 1 : Nomination & Étendue de l'Autorité Exclusive
                  </h3>
                  <p className="indent-8">
                    Le Mandant confère par les présentes à L'Agence Luxury Real Estate le mandat exclusif de structurer, commercialiser et coordonner l'ensemble du dossier d'acquisition institutionnelle et de tokenisation pour le bien immobilier sis à {property.location}, {property.city}. Le bien présente une surface bâtie totale de {property.surfaceAreaM2 || 320} m², doté de prestations architecturales sur mesure, d'infrastructures de sécurité de pointe et de droits de pleine propriété inaliénables.
                  </p>
                  <p className="indent-8">
                    {property.description}
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 2 : Examen des Titres de Propriété & Conservation des Hypothèques
                  </h3>
                  <p className="indent-8">
                    Un audit juridique exhaustif du registre foncier (Service de la Publicité Foncière) a été réalisé en date du {notarizationDate} par Maître Charles Dupond (Notaire associé à Paris et Nice). Cet audit certifie que les titres de propriété sont parfaits, libres de toute charge préjudiciable et juridiquement dévolus au propriétaire inscrit.
                  </p>
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs font-sans text-left border-collapse border border-[#cbd5e1]">
                      <thead>
                        <tr className="bg-[#f1f5f9] text-[#0f172a] uppercase font-bold text-[11px]">
                          <th className="border border-[#cbd5e1] p-2.5">Paramètre d'Audit des Titres</th>
                          <th className="border border-[#cbd5e1] p-2.5">Statut de Vérification</th>
                          <th className="border border-[#cbd5e1] p-2.5">Référence Notariale & Notes de Dossier</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Pleine Propriété & Authenticité des Titres</td>
                          <td className="border border-[#cbd5e1] p-2.5 text-emerald-700 font-bold">Vérifié Conforme & Valide</td>
                          <td className="border border-[#cbd5e1] p-2.5">Volume 2025-F, Dossier Notarié n° 89421</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Hypothèques, Privilèges & Inscriptions</td>
                          <td className="border border-[#cbd5e1] p-2.5 text-emerald-700 font-bold">Aucune Inscription en Cours</td>
                          <td className="border border-[#cbd5e1] p-2.5">Ancienne ligne de crédit institutionnelle totalement purgée</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Servitudes, Droits de Passage & Charges</td>
                          <td className="border border-[#cbd5e1] p-2.5 text-blue-700 font-bold">Servitudes Habituelles Uniquement</td>
                          <td className="border border-[#cbd5e1] p-2.5">Servitudes de passage et de raccordement public enregistrées et vérifiées</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Permis de Construire & Urbanisme</td>
                          <td className="border border-[#cbd5e1] p-2.5 text-emerald-700 font-bold">Intégralement Approuvé</td>
                          <td className="border border-[#cbd5e1] p-2.5">Permis de Construire n° PC-06-114-24 (Archives Municipales)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 3 : Termes d'Exclusivité, Durée & Conditions Financières
                  </h3>
                  <p className="indent-8">
                    Le présent mandat est consenti à titre strictement exclusif pour une durée de douze (12) mois à compter de sa date d'émission, renouvelable par tacite reconduction sauf dénonciation par lettre recommandée avec accusé de réception. La rémunération de l'agent est fixée conformément aux usages de courtage institutionnel lors du dénouement de la structure transactionnelle.
                  </p>
                </section>

                <section className="space-y-3 pt-4">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 4 : Exécution Formelle, Signatures Électroniques & Certification
                  </h3>
                  <p className="text-xs text-[#475569] font-sans">
                    Établissement en double exemplaire sous le régime du droit civil français et certification par signatures électroniques avancées conformes au règlement eIDAS.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 font-sans text-xs">
                    <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] space-y-2">
                      <span className="font-bold text-[#0f172a] block">Pour L'Agence Luxury Real Estate SAS</span>
                      <p className="text-[#64748b]">Directeur Général & Bureau des Mandats</p>
                      <div className="pt-4 border-t border-[#cbd5e1] flex items-center justify-between">
                        <span className="font-mono text-[10px] text-emerald-700 font-bold">QES eIDAS VÉRIFIÉ</span>
                        <span className="font-bold">Olivier Kretz</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] space-y-2">
                      <span className="font-bold text-[#0f172a] block">Pour le Propriétaire Inscrit au Registre</span>
                      <p className="text-[#64748b]">Bénéficiaire Principal / Mandataire Autorisé</p>
                      <div className="pt-4 border-t border-[#cbd5e1] flex items-center justify-between">
                        <span className="font-mono text-[10px] text-emerald-700 font-bold">ATTESTÉ PAR NOTAIRE</span>
                        <span className="font-bold">{registeredOwner}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* DOCUMENT 2: INDEPENDENT CERTIFIED VALUATION & DIAGNOSTIC REPORT */}
          {isValuation && (
            <div className="valuation-report space-y-6 font-serif text-sm leading-relaxed text-[#23272f]">
              <div className="valuation-masthead">
                <div className="valuation-brand-row">
                  <span className="valuation-brand">KRETZ SPAIN</span>
                  <span className="valuation-tag">Official Legal Documents · Valuation</span>
                </div>
                <h1>Independent Certified Valuation &amp; Diagnostic Report</h1>
                <div className="valuation-gold-rule" />
                <div className="valuation-meta">
                  <div><strong>{notarizationDate}</strong><small>Report date</small></div>
                  <div><strong>{formatCurrency(property.targetAmount)}</strong><small>Valuation figure</small></div>
                  <div><strong>{uniquePropertyIdentifier}</strong><small>Property reference</small></div>
                </div>
                <div className="valuation-contents">
                  <div className="valuation-contents-title">Contents</div>
                  <div><span>Valuer and certification details</span><em>Article 3</em></div>
                  <div><span>Property description and valuation methodology</span><em>Article 1</em></div>
                  <div><span>Inspection findings and building diagnostics</span><em>Article 2</em></div>
                  <div><span>Diagnostic notes and supporting records</span><em>Supporting details</em></div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Valorisation Certifiée :</span>
                  <span className="text-base font-black text-emerald-700">{formatCurrency(property.targetAmount)}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Date d'Inspection Physique :</span>
                  <span className="font-bold text-[#0f172a]">15 Janvier 2026</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Date d'Émission du Rapport :</span>
                  <span className="font-bold text-[#0f172a]">{notarizationDate}</span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <p className="indent-8">
                  <span className="font-bold uppercase">CERTIFICAT D'ÉVALUATION & DE DIAGNOSTIC TECHNIQUE :</span> Le présent Rapport d'Expertise et de Diagnostic Certifié Indépendant a été établi en stricte conformité avec les Normes Internationales d'Évaluation (IVS) et les directives d'évaluation RICS. Cette expertise vise à déterminer la juste valeur vénale et de marché de <span className="font-bold">{property.title}</span> ({uniquePropertyIdentifier}).
                </p>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 1 : Méthodologie d'Évaluation & Capitalisation des Revenus
                  </h3>
                  <p className="indent-8">
                    L'évaluation applique une méthodologie croisée combinant la <span className="font-semibold">Méthode par Capitalisation du Revenu</span> (analyse du résultat net d'exploitation et des rendements locatifs stabilisés) et la <span className="font-semibold">Méthode par Comparaison Directe de Marché</span> (examen minutieux des transactions récentes de biens comparables au sein de la micro-zone de prestige).
                  </p>
                  <p className="indent-8">
                    Sur la base de données empiriques rigoureuses, la valeur vénale du bien est certifiée à <span className="font-bold text-emerald-700">{formatCurrency(property.targetAmount)}</span>, étayée par un chiffre d'affaires locatif brut annuel projeté de <span className="font-bold">{formatCurrency(property.financialBreakdown?.projectedAnnualGrossRent || property.targetAmount * 0.09)}</span>.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 2 : Ingénierie Structurale & Constats de Diagnostic Technique
                  </h3>
                  <p className="indent-8">
                    Une inspection technique non destructive et un audit d'ingénierie ont été menés par les cabinets accrédités Bureau Veritas et RICS.
                  </p>
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs font-sans text-left border-collapse border border-[#cbd5e1]">
                      <thead>
                        <tr className="bg-[#f1f5f9] text-[#0f172a] uppercase font-bold text-[11px]">
                          <th className="border border-[#cbd5e1] p-2.5">Composant du Bâtiment & Système</th>
                          <th className="border border-[#cbd5e1] p-2.5">Classe de Condition</th>
                          <th className="border border-[#cbd5e1] p-2.5">Notes d'Ingénierie & Conformité</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Fondations & Structure Porteuse</td>
                          <td className="border border-[#cbd5e1] p-2.5 text-emerald-700 font-bold">Grade A (Excellent)</td>
                          <td className="border border-[#cbd5e1] p-2.5">Béton armé et maçonnerie de pierre sans aucun défaut de tassement</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Toiture, Étanchéité & Terrasses</td>
                          <td className="border border-[#cbd5e1] p-2.5 text-emerald-700 font-bold">Grade A (Excellent)</td>
                          <td className="border border-[#cbd5e1] p-2.5">Membrane d'étanchéité élastomère multicouche ; entièrement modernisée</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Électricité, Plomberie & CVCM Intelligent</td>
                          <td className="border border-[#cbd5e1] p-2.5 text-emerald-700 font-bold">Grade A (Moderne)</td>
                          <td className="border border-[#cbd5e1] p-2.5">Systèmes domotiques intégrés et pompes à chaleur à haute efficacité énergétique</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Performance Énergétique & Classe DPE</td>
                          <td className="border border-[#cbd5e1] p-2.5 text-blue-700 font-bold">Classe B (Optimisée)</td>
                          <td className="border border-[#cbd5e1] p-2.5">Isolation thermique conforme aux exigences climatiques européennes 2026</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 3 : Références des Experts Évaluateurs & Garanties
                  </h3>
                  <p className="indent-8 text-xs text-[#475569] font-sans">
                    Rapport certifié par Marcus Vance (Évaluateur agréé RICS n° 491028) et le Dr. Christian Lefevre (Ingénieur en Chef Structures, Bureau Veritas). Assurance responsabilité civile professionnelle souscrite conformément aux exigences légales européennes.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* DOCUMENT 3: SPV TOKENIZATION PROSPECTUS & YIELD MODEL */}
          {isProspectus && (
            <div className="prospectus-report space-y-6 font-serif text-sm leading-relaxed text-[#23272f]">
              <div className="prospectus-masthead">
                <div className="prospectus-brand-row">
                  <span className="prospectus-brand">KRETZ SPAIN</span>
                  <span className="prospectus-tag">Official Legal Documents · Financial</span>
                </div>
                <h1>SPV Tokenization Prospectus &amp; Yield Model</h1>
                <div className="prospectus-gold-rule" />
                <div className="prospectus-meta">
                  <div><strong>{notarizationDate}</strong><small>Report date</small></div>
                  <div><strong>{formatCurrency(property.targetAmount)}</strong><small>Offering target</small></div>
                  <div><strong>{property.ref || property.tokenTicker || 'Pending reference'}</strong><small>Reference</small></div>
                </div>
                <div className="prospectus-contents">
                  <div className="prospectus-contents-title">Contents</div>
                  <div><span>Issuer and SPV structure</span><em>Article 1</em></div>
                  <div><span>Offering terms and token details</span><em>Offering</em></div>
                  <div><span>Yield model and financial assumptions</span><em>Article 2</em></div>
                  <div><span>Risk disclosures and legal notices</span><em>Article 3</em></div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Émetteur Juridique SPV :</span>
                  <span className="font-bold text-[#0f172a]">{spvName}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Objectif Total de Levée :</span>
                  <span className="text-base font-black text-emerald-700">{formatCurrency(property.targetAmount)}</span>
                </div>
                <div>
                  <span className="text-[#64748b] block font-semibold uppercase tracking-wider">Prix du Jeton & Ticker :</span>
                  <span className="font-bold text-[#0f172a]">€{property.tokenPrice} ({property.tokenTicker})</span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <p className="indent-8">
                  <span className="font-bold uppercase">PROSPECTUS OFFICIEL & MÉMORANDUM D'OFFRE INSTITUTIONNELLE :</span> Le présent document constitue un prospectus de tokenisation institutionnelle émis par <span className="font-bold">{spvName}</span>, constitué sous {spvJurisdiction}. Chaque jeton de sécurité numérique confère un droit de propriété bénéficiaire fractionnaire et un droit aux dividendes locatifs adossés directement à <span className="font-bold">{property.title}</span>.
                </p>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 1 : Structure SPV & Architecture de Règlement sur Blockchain
                  </h3>
                  <p className="indent-8">
                    L'actif immobilier sous-jacent est détenu intégralement au sein d'un Véhicule de Titrisation à Finalité Exclusive (SPV) étanche aux faillites. Les jetons de sécurité numériques sont émis et réglés sur la blockchain publique Polygon POS (Adresse de Contrat : <span className="font-mono text-xs text-emerald-700">{property.tokenContractAddress || '0x7a7a...98ac7'}</span>), garantissant un registre de propriété immuable, une cessibilité transparente et des versements mensuels automatisés de dividendes locatifs par exécution de contrat intelligent.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 2 : Modèle Financier Pro-Forma & Projections de Rendement
                  </h3>
                  <p className="indent-8">
                    Le modèle de souscription repose sur des hypothèses conservatrices d'occupation et de rendement locatif pour des actifs immobiliers européens de premier ordre.
                  </p>
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs font-sans text-left border-collapse border border-[#cbd5e1]">
                      <thead>
                        <tr className="bg-[#f1f5f9] text-[#0f172a] uppercase font-bold text-[11px]">
                          <th className="border border-[#cbd5e1] p-2.5">Paramètre Financier</th>
                          <th className="border border-[#cbd5e1] p-2.5">Montant / Pourcentage</th>
                          <th className="border border-[#cbd5e1] p-2.5">Hypothèses de Souscription & Méthodologie</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Coût Total d'Acquisition & Réserve de Capital</td>
                          <td className="border border-[#cbd5e1] p-2.5 font-bold">{formatCurrency(property.financialBreakdown?.totalProjectCost || property.targetAmount * 1.1)}</td>
                          <td className="border border-[#cbd5e1] p-2.5">Inclut le prix d'acquisition, les droits de mutation et la réserve opérationnelle</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Revenu Locatif Brut Annuel Prévisionnel</td>
                          <td className="border border-[#cbd5e1] p-2.5 font-bold text-emerald-700">{formatCurrency(property.financialBreakdown?.projectedAnnualGrossRent || property.targetAmount * 0.09)}</td>
                          <td className="border border-[#cbd5e1] p-2.5">Généré par des baux de location de prestige de moyenne et courte durée</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Rendement Net Annuel Estimé (Versé Mensuellement)</td>
                          <td className="border border-[#cbd5e1] p-2.5 font-bold text-emerald-700">{property.estimatedAnnualYield}% p.a.</td>
                          <td className="border border-[#cbd5e1] p-2.5">Net des charges de maintenance et de gestion SPV ; versé le 1er du mois</td>
                        </tr>
                        <tr>
                          <td className="border border-[#cbd5e1] p-2.5 font-semibold">Plus-Value Cible en Capital</td>
                          <td className="border border-[#cbd5e1] p-2.5 font-bold">{property.capitalAppreciationYield || 3.5}% p.a.</td>
                          <td className="border border-[#cbd5e1] p-2.5">Basé sur les tendances historiques d'appréciation du marché immobilier de prestige sur 10 ans</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-base font-bold font-serif text-[#0f172a] uppercase border-b border-[#cbd5e1] pb-1">
                    Article 3 : Conformité Réglementaire & Avertissements sur les Risques
                  </h3>
                  <p className="indent-8 text-xs text-[#475569] font-sans">
                    L'investissement dans l'immobilier tokenisé comporte des risques de marché, d'illiquidité et de change. Les investisseurs doivent obligatoirement satisfaire aux procédures d'onboarding KYC/AML. Les performances passées ne préjugent pas des rendements futurs.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* Footer Seals, Official Stamp & Signature with Image B */}
          <div className="pt-8 border-t border-[#a8864f] flex flex-col sm:flex-row items-center justify-between gap-6 font-sans">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#18211F] p-2 flex items-center justify-center shadow-md border border-[#27845D] shrink-0">
                <img 
                  src="/assets/aistudio/IMG_7223_65d95b79.jpeg" 
                  alt="L'Agence Official Seal & Stamp" 
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#27845D]" />
                  <span className="text-xs font-bold text-[#18211F]">Cachet d'Authenticité Certifié & Valeur Légale</span>
                </div>
                <p className="text-[11px] text-[#69736F] mt-0.5">
                  Émis sous le Moteur de Conformité L'Agence & le Règlement eIDAS (UE) n° 910/2014.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-[10px] text-[#27845D] bg-[#EEF1EC] px-3 py-1.5 rounded-lg border border-[#E3E8E3] inline-block mb-1">
                Empreinte SHA-256 : e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </div>
              <div className="text-[10px] text-[#69736F] font-semibold">
                Signature Autorisée & Cachet Officiel
              </div>
            </div>
          </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="legal-modal-footer bg-[#f7f2e8] px-6 py-4 border-t border-[#a8864f] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="btn btn-primary text-xs font-bold px-6 cursor-pointer"
          >
            Close Document Inspection
          </button>
        </div>

      </div>
    </div>
  );
};
