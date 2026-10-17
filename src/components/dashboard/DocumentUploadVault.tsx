import React, { useState, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger, VerificationDocument, DocumentCategory } from '../../lib/ledger';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  ShieldCheck,
  Building2,
  CreditCard,
  UserCheck,
  ArrowRight,
  ExternalLink,
  Plus,
  X,
  FileCheck,
  Sparkles
} from 'lucide-react';

interface DocumentUploadVaultProps {
  onNavigateAdmin?: () => void;
  onNavigateWallet?: () => void;
}

export const DocumentUploadVault: React.FC<DocumentUploadVaultProps> = ({
  onNavigateAdmin,
  onNavigateWallet
}) => {
  const { user, refreshUser, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [category, setCategory] = useState<DocumentCategory>('deposit_proof');
  const [docType, setDocType] = useState('Bank Wire Transfer Receipt');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>(5000);
  const [currency, setCurrency] = useState('EUR');
  const [depositRef, setDepositRef] = useState('');
  const [notes, setNotes] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<VerificationDocument | null>(null);

  if (!user) return null;

  const uploadedDocs = ledger.getVerificationDocuments(user.id);
  const pendingDeposits = ledger.getTransactions(user.id).filter(t => t.type === 'deposit' && t.status === 'pending');

  const handleFile = (file: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, WebP) or PDF document.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15MB limit. Please upload a smaller file.');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFileBase64(result);
    };
    reader.onerror = () => {
      setError('Failed to read file. Please try selecting again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectDepositRef = (ref: string, depAmount: number) => {
    setDepositRef(ref);
    setAmount(depAmount);
    setTitle(`Proof of Transfer: CaixaBank Wire (${ref})`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fileBase64 && !selectedFile) {
      setError('Please select or drop a document/receipt file to upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedTitle = title.trim() || (
        category === 'deposit_proof' 
          ? `Deposit Proof: ${depositRef || 'Bank Wire'} (${amount ? formatCurrency(Number(amount)) : 'Transfer'})`
          : `${docType} Verification`
      );

      ledger.uploadVerificationDocument({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        category,
        title: generatedTitle,
        documentType: docType,
        fileUrl: fileBase64 || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80',
        fileName: fileName || `${category}_${Date.now()}.pdf`,
        fileSize: fileSize || 180000,
        transactionReference: depositRef.trim() || undefined,
        amount: typeof amount === 'number' ? amount : undefined,
        currency: currency,
        notes: notes.trim() || undefined
      });

      refreshUser();
      setSuccessMsg('Document successfully uploaded to Compliance Vault! It is now pending administrative confirmation and approval.');
      // Reset form
      setSelectedFile(null);
      setFileBase64('');
      setFileName('');
      setFileSize(0);
      setDepositRef('');
      setNotes('');
      setTitle('');

      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoc = (id: string, docTitle: string) => {
    if (confirm(`Remove document "${docTitle}" from compliance vault?`)) {
      ledger.deleteVerificationDocument(id);
      refreshUser();
      setSuccessMsg(`Document "${docTitle}" removed.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#27845D] text-[10px] font-bold uppercase tracking-wider border border-emerald-200/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MiCA Compliance Vault · Tier 1 Audit Trail</span>
          </div>
          <h2 className="text-2xl font-black text-[#18211F] tracking-tight">
            Profile Settings & Compliance
          </h2>
          <p className="text-xs text-[#69736F]">
            Manage your investor profile settings, upload bank wire deposit receipts, crypto confirmations, and AML/KYC identity documents for administrator confirmation.
          </p>
        </div>

        {/* Quick jump for admin or testing */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={onNavigateAdmin}
              className="px-4 py-2.5 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
            >
              <ShieldCheck className="w-4 h-4 text-[#B7E36A]" />
              <span>Admin: Review & Approve Uploads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <a
              href="/admin#deposits"
              className="px-4 py-2.5 rounded-xl bg-[#EEF2EC] hover:bg-[#E3E8E3] text-[#182D2A] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-[#DCE4DA] shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#27845D]" />
              <span>Open Admin Approval Portal</span>
            </a>
          )}
        </div>
      </div>

      {/* 2. Success and Error Feedbacks */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Main Upload Form Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
        <div className="border-b border-[#E3E8E3] pb-4">
          <h3 className="text-base font-bold text-[#18211F]">Upload New Document or Proof</h3>
          <p className="text-xs text-[#69736F]">Choose document category and attach file. Submissions are reviewed by our compliance desk.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Switcher */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#18211F]">
              Select Document Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCategory('deposit_proof');
                  setDocType('Bank Wire Transfer Receipt');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  category === 'deposit_proof'
                    ? 'border-[#182D2A] bg-[#EEF2EC] text-[#182D2A] shadow-xs ring-1 ring-[#182D2A]'
                    : 'border-[#E3E8E3] hover:border-slate-400 bg-white text-[#4A5551]'
                }`}
              >
                <CreditCard className={`w-5 h-5 shrink-0 mt-0.5 ${category === 'deposit_proof' ? 'text-[#27845D]' : 'text-slate-400'}`} />
                <div>
                  <h4 className="text-xs font-bold">Deposit / Transfer Proof</h4>
                  <p className="text-[11px] text-[#69736F] mt-0.5">SEPA wire slips & crypto receipts</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('kyc_identity');
                  setDocType('International Passport');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  category === 'kyc_identity'
                    ? 'border-[#182D2A] bg-[#EEF2EC] text-[#182D2A] shadow-xs ring-1 ring-[#182D2A]'
                    : 'border-[#E3E8E3] hover:border-slate-400 bg-white text-[#4A5551]'
                }`}
              >
                <UserCheck className={`w-5 h-5 shrink-0 mt-0.5 ${category === 'kyc_identity' ? 'text-[#27845D]' : 'text-slate-400'}`} />
                <div>
                  <h4 className="text-xs font-bold">Identity Verification (KYC)</h4>
                  <p className="text-[11px] text-[#69736F] mt-0.5">Passport, National ID or Driver's License</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory('proof_of_address');
                  setDocType('Utility Bill / Bank Statement');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  category === 'proof_of_address'
                    ? 'border-[#182D2A] bg-[#EEF2EC] text-[#182D2A] shadow-xs ring-1 ring-[#182D2A]'
                    : 'border-[#E3E8E3] hover:border-slate-400 bg-white text-[#4A5551]'
                }`}
              >
                <Building2 className={`w-5 h-5 shrink-0 mt-0.5 ${category === 'proof_of_address' ? 'text-[#27845D]' : 'text-slate-400'}`} />
                <div>
                  <h4 className="text-xs font-bold">Proof of Address / SPV</h4>
                  <p className="text-[11px] text-[#69736F] mt-0.5">Utility bill, bank statement, articles</p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick link to Pending Deposits if Category is deposit_proof */}
          {category === 'deposit_proof' && pendingDeposits.length > 0 && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
              <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">
                Link to Your Pending Deposit Request:
              </span>
              <div className="flex flex-wrap gap-2">
                {pendingDeposits.map(tx => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => handleSelectDepositRef(tx.reference, tx.amount)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      depositRef === tx.reference
                        ? 'bg-amber-900 text-white border-amber-900'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <span>{tx.reference} ({formatCurrency(tx.amount)})</span>
                    {depositRef === tx.reference && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document Details Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#18211F] mb-1">
                Document Type
              </label>
              {category === 'deposit_proof' ? (
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
                >
                  <option value="Bank Wire Transfer Receipt">Bank Wire Transfer Receipt (SEPA / CaixaBank)</option>
                  <option value="SWIFT MT103 Confirmation Slip">SWIFT MT103 Confirmation Slip</option>
                  <option value="Crypto Blockchain Tx Screenshot">Crypto Blockchain Tx Screenshot (Etherscan/Polygon)</option>
                  <option value="Certified Bank Deposit Stamped Copy">Certified Bank Deposit Stamped Copy</option>
                </select>
              ) : category === 'kyc_identity' ? (
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
                >
                  <option value="International Passport">International Passport (Biometric Page)</option>
                  <option value="National Identity Card">European National Identity Card (DNI / NIE)</option>
                  <option value="Driver's License">Driver's License (Front & Back)</option>
                  <option value="Permanent Residence Permit">Permanent Residence Permit</option>
                </select>
              ) : (
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
                >
                  <option value="Utility Bill">Utility Bill (Electricity, Water, Gas &lt; 90 Days)</option>
                  <option value="Bank Statement">Official Bank Statement with Residence Address</option>
                  <option value="Tax Residency Certificate">Tax Residency Certificate (Agencia Tributaria)</option>
                  <option value="Corporate Articles of Association">Corporate Articles of Association / Deeds</option>
                </select>
              )}
            </div>

            {category === 'deposit_proof' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#18211F] mb-1">Deposit Amount (€)</label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="5000"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#18211F] mb-1">Transfer Reference</label>
                  <input
                    type="text"
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    placeholder="e.g. DEP-EUR-849201"
                    className="w-full text-xs font-mono font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-[#18211F] mb-1">Document Title / Note</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Passport Biometric Photo Scan"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
                />
              </div>
            )}
          </div>

          {/* Interactive Drag & Drop Upload Zone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#18211F]">
              Attach Official Document File / Scan
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-600 bg-emerald-50/60'
                  : selectedFile
                  ? 'border-emerald-500 bg-[#F6F9F6]'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] hover:bg-slate-100 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                    <FileCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#18211F] truncate max-w-sm">{fileName}</h4>
                    <p className="text-xs text-[#69736F]">
                      {(fileSize / 1024).toFixed(1)} KB · Ready to submit for compliance confirmation
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setFileBase64('');
                      setFileName('');
                      setFileSize(0);
                    }}
                    className="text-xs font-bold text-red-600 hover:underline mt-1 cursor-pointer"
                  >
                    Choose another file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#E3E8E3] text-[#27845D] flex items-center justify-center mx-auto shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#18211F] block">
                      Click to browse or drag and drop your file here
                    </span>
                    <p className="text-xs text-[#69736F] mt-0.5">
                      Supported formats: PDF, JPG, PNG, WebP (Max 15MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes for compliance reviewer */}
          <div>
            <label className="block text-xs font-semibold text-[#69736F] mb-1">
              Additional Notes for Administrator / Compliance Officer (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wire transfer dispatched from CaixaBank online banking at 10:15 AM."
              className="w-full text-xs p-3 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
            />
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#E3E8E3]">
            <p className="text-[11px] text-[#828D89]">
              Submitted documents are stored encrypted under Spanish GDPR and European AML regulations.
            </p>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="btn btn-primary text-xs font-bold px-6 py-3 w-full sm:w-auto bg-[#182D2A] hover:bg-[#24423C] text-white flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Vault...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-[#B7E36A]" />
                  <span>Upload & Request Admin Confirmation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 4. Vault Listing of Uploaded Documents */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E8E3] pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#18211F]">Your Uploaded Verification Vault ({uploadedDocs.length})</h3>
            <p className="text-xs text-[#69736F]">Live tracking of submitted receipts and identity compliance approvals.</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-[#EEF1EC] text-[#27845D] rounded-full self-start sm:self-auto">
            {uploadedDocs.filter(d => d.status === 'pending').length} Pending Admin Approval
          </span>
        </div>

        {uploadedDocs.length === 0 ? (
          <div className="text-center py-12 text-[#69736F] space-y-3">
            <FileText className="w-12 h-12 mx-auto opacity-30 text-[#182D2A]" />
            <p className="text-sm font-semibold text-[#18211F]">No documents uploaded yet.</p>
            <p className="text-xs max-w-sm mx-auto">
              Use the upload area above to attach your deposit bank wire receipt or identity card for admin review.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-2xl border border-[#E3E8E3] bg-[#F6F7F4]/60 hover:bg-[#F6F7F4] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {doc.category === 'deposit_proof' ? (
                      <CreditCard className="w-6 h-6" />
                    ) : doc.category === 'kyc_identity' ? (
                      <UserCheck className="w-6 h-6" />
                    ) : (
                      <FileText className="w-6 h-6" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#18211F]">{doc.title}</span>
                      {doc.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-700 animate-pulse" />
                          <span>Pending Admin Confirmation</span>
                        </span>
                      )}
                      {doc.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Confirmed & Approved</span>
                        </span>
                      )}
                      {doc.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-200">
                          <XCircle className="w-3 h-3 text-red-700" />
                          <span>Declined / Re-upload Required</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#69736F] flex flex-wrap gap-x-3 gap-y-1">
                      <span>Type: <strong className="text-[#18211F]">{doc.documentType}</strong></span>
                      {doc.transactionReference && (
                        <span>Ref: <strong className="font-mono text-[#18211F]">{doc.transactionReference}</strong></span>
                      )}
                      {doc.amount && (
                        <span>Amount: <strong className="text-[#27845D]">{formatCurrency(doc.amount)} {doc.currency}</strong></span>
                      )}
                      <span>File: <span className="font-mono">{doc.fileName}</span></span>
                      <span>Uploaded: {formatDate(doc.uploadedAt)}</span>
                    </div>

                    {doc.notes && (
                      <p className="text-[11px] text-[#4A5551] italic bg-white p-2 rounded-lg border border-[#E3E8E3] mt-1">
                        Note: "{doc.notes}"
                      </p>
                    )}

                    {doc.rejectionReason && (
                      <div className="p-2 rounded-lg bg-red-50 text-red-800 text-[11px] font-semibold flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Compliance Feedback: {doc.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="btn btn-secondary btn-sm text-xs font-bold px-3 py-2 border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#18211F] flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#27845D]" />
                    <span>View Document</span>
                  </button>

                  {doc.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id, doc.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Document Fullscreen Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#E3E8E3] relative max-h-[90vh] flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E3E8E3] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#27845D] tracking-wider block">
                  Encrypted Compliance Document Viewer
                </span>
                <h3 className="text-lg font-black text-[#18211F]">{previewDoc.title}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content View */}
            <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-950 p-2 flex items-center justify-center min-h-[300px]">
              {previewDoc.fileUrl.startsWith('data:image') || previewDoc.fileUrl.startsWith('http') ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md"
                />
              ) : (
                <div className="text-center p-8 text-white space-y-2">
                  <FileText className="w-16 h-16 mx-auto text-emerald-400" />
                  <p className="text-sm font-bold">{previewDoc.fileName}</p>
                  <p className="text-xs text-slate-400">PDF document file stored in encrypted format</p>
                </div>
              )}
            </div>

            {/* Document Metadata Bar */}
            <div className="p-3 bg-[#F6F7F4] rounded-2xl border border-[#E3E8E3] flex flex-wrap items-center justify-between text-xs text-[#69736F] gap-2">
              <div>
                <span>Document: <strong className="text-[#18211F]">{previewDoc.documentType}</strong></span>
                {previewDoc.transactionReference && (
                  <span className="ml-3">Ref: <strong className="font-mono text-[#18211F]">{previewDoc.transactionReference}</strong></span>
                )}
              </div>
              <div>
                <span>Uploaded: <strong>{formatDate(previewDoc.uploadedAt)}</strong></span>
              </div>
            </div>

            {/* Admin Approval Quick Action Button inside preview */}
            {isAdmin && previewDoc.status === 'pending' && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3E8E3]">
                <button
                  type="button"
                  onClick={() => {
                    ledger.reviewVerificationDocument(previewDoc.id, true);
                    refreshUser();
                    setPreviewDoc(null);
                    setSuccessMsg(`Document "${previewDoc.title}" confirmed & approved!`);
                  }}
                  className="btn btn-primary text-xs font-bold px-4 py-2 bg-[#27845D] text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Confirm Document Now</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
