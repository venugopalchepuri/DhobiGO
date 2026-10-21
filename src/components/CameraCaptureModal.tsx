import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RotateCw, Check, X, RefreshCw } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (imageDataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureComplete,
}) => {
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedPreview(event.target?.result as string);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleConfirm = () => {
    if (!capturedPreview) return;

    // Process and compress image to reasonable dimensions (max 1600px) with 0.85 JPEG quality
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onCaptureComplete(capturedPreview);
        onClose();
        return;
      }

      const maxDim = 1600;
      let targetW = img.width;
      let targetH = img.height;

      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      if (rotation === 90 || rotation === 270) {
        canvas.width = targetH;
        canvas.height = targetW;
      } else {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      const drawW = rotation === 90 || rotation === 270 ? targetH : targetW;
      const drawH = rotation === 90 || rotation === 270 ? targetW : targetH;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCaptureComplete(compressedDataUrl);
      onClose();
    };
    img.onerror = () => {
      onCaptureComplete(capturedPreview);
      onClose();
    };
    img.src = capturedPreview;
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {capturedPreview ? 'Confirm Chit Photo' : 'Capture Laundry Chit'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {capturedPreview
                ? 'Check that handwritten numbers are legible'
                : 'Snap slip with phone camera or pick from gallery'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden native inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Body content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {capturedPreview ? (
            <div className="flex flex-col items-center">
              <div className="w-full h-72 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-inner">
                <img
                  src={capturedPreview}
                  alt="Chit Preview"
                  className="max-h-full max-w-full object-contain transition-transform duration-200"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>

              {/* Adjust bar */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={handleRotate}
                  className="min-h-[44px] px-3.5 flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
                >
                  <RotateCw className="w-4 h-4 text-slate-600" />
                  <span>Rotate</span>
                </button>

                <button
                  onClick={handleRetake}
                  className="min-h-[44px] px-3.5 flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
                >
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <span>Retake</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-4">
              {/* Option A: Phone Camera */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-200 hover:border-blue-400 flex items-center gap-4 text-left active:scale-[0.99] transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Take Photo with Camera</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Launch Android camera to snap paper slip
                  </p>
                </div>
              </button>

              {/* Option B: Gallery Photo Picker */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex items-center gap-4 text-left active:scale-[0.99] transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Choose from Photo Gallery</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Select an existing photo or screenshot
                  </p>
                </div>
              </button>

              <div className="mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">Durable Storage:</span> The photo is permanently saved in your device's private database and will survive app restarts and reboots.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {capturedPreview && (
          <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <button
              onClick={handleRetake}
              className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Attach Chit</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
