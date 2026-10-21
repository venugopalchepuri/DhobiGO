import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Sun, Download } from 'lucide-react';

interface ChitViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  subtitle?: string;
}

export const ChitViewerModal: React.FC<ChitViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Dhobi Slip Chit',
  subtitle,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [highContrast, setHighContrast] = useState(false);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.35, 3.5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.35, 0.75));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleToggleContrast = () => setHighContrast((c) => !c);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `dhobi-chit-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
        <div>
          <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative select-none">
        <div
          className="transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing max-h-[75vh] max-w-[90vw]"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            filter: highContrast ? 'contrast(1.6) brightness(1.1) grayscale(0.2)' : 'none',
          }}
        >
          <img
            src={imageUrl}
            alt="Original Dhobi Chit Slip"
            className="rounded-lg shadow-2xl max-h-[75vh] max-w-[90vw] object-contain"
            draggable={false}
          />
        </div>

        {/* Quick hint badge */}
        {highContrast && (
          <div className="absolute top-4 left-4 bg-amber-500/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-md">
            Dhobi High-Contrast Mode ON
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="flex items-center justify-center gap-2 pt-3 border-t border-white/10">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <button
          onClick={handleRotate}
          title="Rotate 90°"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
        >
          <RotateCw className="w-5 h-5" />
        </button>

        <button
          onClick={handleToggleContrast}
          title="Boost Contrast for Dhobi"
          className={`min-h-[44px] px-3 flex items-center gap-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-all ${
            highContrast ? 'bg-amber-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Show to Dhobi</span>
        </button>

        <button
          onClick={handleDownload}
          title="Download original photo"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
