import React, { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageUploaderProps {
  label: string;
  onImageUpload: (base64: string) => void;
  currentImage?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  onImageUpload,
  currentImage,
  className
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageUpload(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0];
    if (item?.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) handleFile(file);
    }
  }, []);

  return (
    <div
      className={cn(
        "relative group flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all h-full min-h-[300px] bg-white",
        isDragging ? "border-brand-blue bg-brand-blue/5" : "border-slate-200 hover:border-brand-blue/50",
        className
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={0}
    >
      {currentImage ? (
        <div className="relative w-full h-full p-2">
          <img 
            src={currentImage} 
            alt="Uploaded" 
            className="w-full h-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
            <p className="text-white text-sm font-medium">点击或拖拽更换图片</p>
          </div>
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="image/*"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 group-hover:text-brand-blue transition-colors">
            <Upload size={24} />
          </div>
          <p className="text-slate-600 font-medium mb-1">{label}</p>
          <p className="text-slate-400 text-sm">支持拖拽、点击上传或直接黏贴</p>
          <input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="image/*"
          />
        </div>
      )}
    </div>
  );
};
