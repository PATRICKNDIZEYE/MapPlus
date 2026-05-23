'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
  currentUrl:   string | null;
  label:        string;
  aspect:       'cover' | 'square';   // cover = 16:9ish banner, square = logo
  onUploaded:   (url: string) => void;
  onUpload:     (base64: string, mimeType: string) => Promise<{ url: string }>;
  disabled?:    boolean;
}

export function ImageUpload({
  currentUrl,
  label,
  aspect,
  onUploaded,
  onUpload,
  disabled,
}: ImageUploadProps) {
  const [preview,    setPreview]    = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, or WebP).');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Client-side compression — target 800 KB, max dimension 1400 px
      const compressed = await imageCompression(file, {
        maxSizeMB:            0.8,
        maxWidthOrHeight:     1400,
        useWebWorker:         true,
        fileType:             'image/jpeg',
      });

      // Read as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1]!);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });

      // Show local preview immediately
      setPreview(URL.createObjectURL(compressed));

      // Upload to API
      const result = await onUpload(base64, 'image/jpeg');
      onUploaded(result.url);
    } catch (err) {
      setError((err as Error).message ?? 'Upload failed. Please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [onUpload, onUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const displayUrl = preview ?? currentUrl;
  const isCover    = aspect === 'cover';

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">{label}</p>

      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`relative overflow-hidden border-2 border-dashed rounded-xl transition-all cursor-pointer
          ${isCover ? 'h-36 w-full' : 'h-24 w-24'}
          ${dragOver           ? 'border-primary-400 bg-primary-50'   : ''}
          ${!dragOver && !displayUrl ? 'border-ink-200 bg-ink-50 hover:border-primary-300 hover:bg-primary-50' : ''}
          ${displayUrl && !dragOver  ? 'border-ink-200'               : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {displayUrl ? (
          <>
            <Image
              src={displayUrl}
              alt={label}
              fill
              className="object-cover"
              sizes={isCover ? '(max-width: 768px) 100vw, 600px' : '96px'}
              unoptimized={displayUrl.startsWith('blob:')}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
              <Upload className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity" strokeWidth={2} />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ImageIcon className="w-6 h-6 text-ink-300" strokeWidth={1.5} />
            <span className="text-xs text-ink-400 font-medium text-center px-2">
              {isCover ? 'Click or drag to upload cover' : 'Upload logo'}
            </span>
          </div>
        )}

        {/* Upload spinner overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" strokeWidth={2} />
          </div>
        )}

        {/* Remove button */}
        {displayUrl && !uploading && !disabled && (
          <button
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-3 h-3" strokeWidth={3} />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-danger-DEFAULT font-medium">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        disabled={disabled || uploading}
      />

      <p className="text-[10px] text-ink-400">
        JPEG · PNG · WebP — compressed automatically · max 4 MB
      </p>
    </div>
  );
}
