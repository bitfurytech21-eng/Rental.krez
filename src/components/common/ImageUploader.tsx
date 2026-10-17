import React, { useState, useRef } from 'react';
import { UploadCloud, Trash2, Camera, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  currentAvatarUrl?: string;
  userName: string;
  onUpload: (base64: string) => void;
  onRemove?: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentAvatarUrl,
  userName,
  onUpload,
  onRemove
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onUpload(result);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file. Please try another.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-[#F6F7F4] border border-[#E3E8E3]">
        {/* Preview Avatar */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold text-2xl overflow-hidden shadow-md border-2 border-white">
            {currentAvatarUrl ? (
              <img src={currentAvatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#27845D] text-white flex items-center justify-center shadow-sm pointer-events-none">
            <Camera className="w-4 h-4" />
          </div>
        </div>

        {/* Upload Dropzone & Controls */}
        <div className="flex-1 w-full space-y-3 text-center sm:text-left">
          <div>
            <h3 className="text-sm font-bold text-[#18211F]">Profile Photo Uploader</h3>
            <p className="text-xs text-[#69736F]">
              Upload a custom profile picture. Recommended square image, max 5MB (PNG, JPG, WebP). Changes update in real-time across your dashboard and header.
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#27845D] bg-green-50/50'
                : 'border-[#E3E8E3] bg-white hover:border-[#27845D]/60 hover:bg-[#F9FAFB]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-2 text-xs text-[#18211F] font-bold">
              <UploadCloud className="w-4 h-4 text-[#27845D]" />
              <span>Click to browse or drag & drop photo here</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 font-semibold">{error}</p>
          )}

          {currentAvatarUrl && onRemove && (
            <div className="pt-1 flex justify-center sm:justify-start">
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove custom photo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
