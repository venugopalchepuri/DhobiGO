import React, { useState } from 'react';
import { AlertTriangle, Check, X, Plus, Minus, Info } from 'lucide-react';
import { ExtractedOCRItem, OCRResult } from '../types';

interface OCRConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrResult: OCRResult;
  onApply: (confirmedData: {
    slipNumber?: string;
    date?: string;
    items: { category: string; quantity: number }[];
  }) => void;
}

export const OCRConfirmationModal: React.FC<OCRConfirmationModalProps> = ({
  isOpen,
  onClose,
  ocrResult,
  onApply,
}) => {
  const [slipNumber, setSlipNumber] = useState(ocrResult.slipNumber || '');
  const [date, setDate] = useState(ocrResult.date || '');
  const [items, setItems] = useState<ExtractedOCRItem[]>(ocrResult.detectedItems || []);

  if (!isOpen) return null;

  const handleQuantityChange = (index: number, delta: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const newQty = Math.max(0, copy[index].quantity + delta);
      copy[index] = { ...copy[index], quantity: newQty };
      return copy.filter((item) => item.quantity > 0);
    });
  };

  const handleDirectQtyInput = (index: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: isNaN(val) ? 0 : Math.max(0, val) };
      return copy;
    });
  };

  const sumOfExtracted = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const statedTotal = ocrResult.totalItemsDetected;
  const hasDiscrepancy = statedTotal !== undefined && statedTotal !== sumOfExtracted;

  const handleConfirmAndApply = () => {
    onApply({
      slipNumber: slipNumber.trim() || undefined,
      date: date.trim() || undefined,
      items: items.map((i) => ({ category: i.category, quantity: i.quantity })),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Review Scanned Slip Values</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify detected items before applying to laundry bag
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Handwriting Reality Notice */}
          <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/70 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold text-amber-900">On-Device OCR Notice:</span> Hand-written dhobi marks and faint pencil notes can be ambiguous. Please review and adjust the extracted quantities below.
            </div>
          </div>

          {/* Slip metadata inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detected Slip #
              </label>
              <input
                type="text"
                value={slipNumber}
                onChange={(e) => setSlipNumber(e.target.value)}
                placeholder="e.g. 1248"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detected Date
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. 20/10/2026"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sum Discrepancy Warning */}
          {hasDiscrepancy && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 leading-relaxed">
                <span className="font-bold">Total Discrepancy:</span> Slip stated a total of{' '}
                <span className="font-mono font-bold text-rose-900">{statedTotal} items</span>, but the sum of detected clothing lines is{' '}
                <span className="font-mono font-bold text-rose-900">{sumOfExtracted} items</span>. Check for missed rows.
              </div>
            </div>
          )}

          {/* Extracted clothing items list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recognized Clothing Items
              </h4>
              <span className="text-xs font-semibold text-slate-500">
                Sum: <span className="font-mono font-bold text-blue-600">{sumOfExtracted}</span> items
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  No standard clothing names were automatically recognized from this chit.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can enter quantities manually in the main form.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-2xl shadow-xs"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900">{item.category}</span>
                      {item.rawText && (
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                          Slip line: "{item.rawText}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuantityChange(idx, -1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => handleDirectQtyInput(idx, e.target.value)}
                        className="w-10 text-center font-mono font-bold text-xs text-slate-900 focus:outline-none"
                      />
                      <button
                        onClick={() => handleQuantityChange(idx, 1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl border border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
          >
            Discard Scan
          </button>
          <button
            onClick={handleConfirmAndApply}
            className="flex-1 min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Bag ({sumOfExtracted} items)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
