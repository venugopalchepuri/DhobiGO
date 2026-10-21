import React, { useState } from 'react';
import {
  Camera,
  ScanText,
  Plus,
  Minus,
  Check,
  X,
  Trash2,
  Calendar,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ClothingCategory, LaundryItem, LaundryRecord, OCRResult } from '../types';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { OCRConfirmationModal } from '../components/OCRConfirmationModal';
import { recognizeChit } from '../utils/ocr';

interface AddLaundryScreenProps {
  initialRecordId: string;
  defaultDhobiName?: string;
  categories: ClothingCategory[];
  onSave: (record: LaundryRecord, items: LaundryItem[]) => Promise<void>;
  onCancel: () => void;
  onAddCustomCategory: (name: string) => Promise<ClothingCategory>;
  editingRecord?: LaundryRecord | null;
  editingItems?: LaundryItem[] | null;
}

export const AddLaundryScreen: React.FC<AddLaundryScreenProps> = ({
  initialRecordId,
  defaultDhobiName = '',
  categories,
  onSave,
  onCancel,
  onAddCustomCategory,
  editingRecord,
  editingItems,
}) => {
  const isEditing = !!editingRecord;

  // Metadata form states
  const [dateGiven, setDateGiven] = useState(
    editingRecord?.dateGiven || new Date().toISOString().split('T')[0]
  );
  const [slipNumber, setSlipNumber] = useState(editingRecord?.slipNumber || '');
  const [dhobiName, setDhobiName] = useState(
    editingRecord?.dhobiName !== undefined ? editingRecord.dhobiName : defaultDhobiName
  );
  const [amount, setAmount] = useState<string>(
    editingRecord?.amount ? editingRecord.amount.toString() : ''
  );
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    editingRecord?.expectedReturnDate || ''
  );
  const [notes, setNotes] = useState(editingRecord?.notes || '');

  // Chit Image state
  const [chitImageData, setChitImageData] = useState<string | null>(
    editingRecord?.chitImageData || null
  );

  // Clothing quantities mapping { [categoryName]: quantity }
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (editingItems && editingItems.length > 0) {
      editingItems.forEach((i) => {
        map[i.category] = i.quantityGiven;
      });
    }
    return map;
  });

  // Modals & OCR state
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrProgressText, setOcrProgressText] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate live total
  const totalItems = Object.values(quantities).reduce((sum, q) => sum + (q || 0), 0);

  // Check if form is dirty for discard warning
  const isDirty = totalItems > 0 || !!slipNumber || !!chitImageData || !!notes;

  const handleQuantityDelta = (catName: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[catName] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [catName]: next };
    });
  };

  const handleDirectQuantity = (catName: string, valStr: string) => {
    const parsed = parseInt(valStr, 10);
    setQuantities((prev) => ({
      ...prev,
      [catName]: isNaN(parsed) ? 0 : Math.max(0, parsed),
    }));
  };

  // Trigger OCR scan on the attached chit
  const handleTriggerOcr = async (imageSrcToScan?: string) => {
    const targetImage = imageSrcToScan || chitImageData;
    if (!targetImage) {
      setIsCameraModalOpen(true);
      return;
    }

    setIsScanningOcr(true);
    setOcrProgressText('Initializing on-device OCR...');

    try {
      const result = await recognizeChit(targetImage, categories, (progress, status) => {
        setOcrProgressText(`${status} (${progress}%)`);
      });

      setOcrResult(result);
      setIsOcrModalOpen(true);
    } catch (err) {
      console.error('OCR failed:', err);
      setErrorMessage('OCR scan could not read this slip clearly. You can enter quantities manually.');
    } finally {
      setIsScanningOcr(false);
    }
  };

  // When user confirms OCR extraction
  const handleApplyOcrResults = (confirmed: {
    slipNumber?: string;
    date?: string;
    items: { category: string; quantity: number }[];
  }) => {
    if (confirmed.slipNumber) setSlipNumber(confirmed.slipNumber);
    if (confirmed.date) {
      // If parsed date matches YYYY-MM-DD or DD/MM/YYYY, convert
      const parts = confirmed.date.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          setDateGiven(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
        } else if (parts[2].length === 4) {
          setDateGiven(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        }
      }
    }

    setQuantities((prev) => {
      const copy = { ...prev };
      confirmed.items.forEach((item) => {
        copy[item.category] = (copy[item.category] || 0) + item.quantity;
      });
      return copy;
    });
  };

  // Add custom category
  const handleCreateCustomCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const cat = await onAddCustomCategory(newCategoryName.trim());
      setQuantities((prev) => ({ ...prev, [cat.name]: 1 }));
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };

  // Save Record
  const handleSaveRecord = async () => {
    if (totalItems <= 0) {
      setErrorMessage('Please add at least 1 clothing item to this laundry bag.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const recordId = editingRecord?.id || initialRecordId;

      const record: LaundryRecord = {
        id: recordId,
        userId: editingRecord?.userId || '',
        slipNumber: slipNumber.trim() || undefined,
        dateGiven,
        dhobiName: dhobiName.trim() || undefined,
        totalItems,
        amount: amount ? parseFloat(amount) : undefined,
        expectedReturnDate: expectedReturnDate || undefined,
        notes: notes.trim() || undefined,
        status: editingRecord?.status || 'pending',
        chitImageData: chitImageData || undefined,
        hasChitImage: !!chitImageData,
        createdAt: editingRecord?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      // Create item objects
      const items: LaundryItem[] = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([category, qty]) => {
          // If editing, preserve previously returned quantity if exists
          const existing = editingItems?.find((ei) => ei.category === category);
          const returned = existing ? Math.min(existing.quantityReturned, qty) : 0;
          return {
            id: existing?.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            category,
            quantityGiven: qty,
            quantityReturned: returned,
          };
        });

      await onSave(record, items);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to save laundry record.');
      setIsSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty && !isEditing) {
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-150">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {editingRecord?.id || initialRecordId}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-medium">
                {isEditing ? 'Editing Laundry Record' : 'New Laundry Bag'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {isEditing ? 'Update Clothing Quantities' : 'Record Clothes for Dhobi'}
            </h2>
          </div>

          <div className="text-right">
            <span className="block text-[11px] font-semibold text-slate-400">Total Count</span>
            <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {totalItems}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Chit Photo Attachment & OCR Box */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Dhobi Slip Photo (Chit)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Preserve original proof to show when collecting bag
            </p>
          </div>
        </div>

        {chitImageData ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 shadow-sm relative group">
              <img
                src={chitImageData}
                alt="Captured Chit"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                  Chit Attached Permanently
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Photo is safely stored in device storage and linked with ID{' '}
                <span className="font-mono font-bold text-slate-700">
                  {editingRecord?.id || initialRecordId}
                </span>.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTriggerOcr(chitImageData)}
                  disabled={isScanningOcr}
                  className="min-h-[38px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {isScanningOcr ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ScanText className="w-3.5 h-3.5" />
                  )}
                  <span>{isScanningOcr ? 'Scanning...' : 'Scan Slip with OCR'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="min-h-[38px] px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Retake Photo
                </button>

                <button
                  type="button"
                  onClick={() => setChitImageData(null)}
                  className="min-h-[38px] px-2.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/40 flex items-center gap-3.5 text-left active:scale-[0.99] transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-900">
                  Photograph Paper Slip
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Camera snapshot or device gallery
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white flex items-center gap-3.5 text-left active:scale-[0.99] transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <ScanText className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-900">
                  Scan & Read Chit (OCR)
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Auto-detect items & slip number
                </span>
              </div>
            </button>
          </div>
        )}

        {/* OCR Scanning Progress Overlay */}
        {isScanningOcr && (
          <div className="mt-3 p-3.5 bg-blue-50 rounded-2xl border border-blue-200/80 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900">Reading laundry slip locally...</p>
              <p className="text-[11px] text-blue-700 mt-0.5">{ocrProgressText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bag Metadata Form */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Laundry Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Date Given */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date Given to Dhobi *
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateGiven}
                onChange={(e) => setDateGiven(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Slip Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Paper Slip # (Optional)
            </label>
            <input
              type="text"
              value={slipNumber}
              onChange={(e) => setSlipNumber(e.target.value)}
              placeholder="e.g. 1042 / A-7"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Dhobi / Shop Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dhobi / Shop Name
            </label>
            <input
              type="text"
              value={dhobiName}
              onChange={(e) => setDhobiName(e.target.value)}
              placeholder="e.g. Ramesh Dhobi / Bright Drycleaners"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Estimated Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount / Charges (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 250"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Expected Return Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expected Return Date
            </label>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Special Instructions
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Silk kurta starch, light iron on shirts"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Clothing Quantities List */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Clothing Items Handed Over</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tap + / - or type quantity directly for one-handed entry
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingCategory((v) => !v)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Item</span>
          </button>
        </div>

        {/* Custom Category Input Form */}
        {isAddingCategory && (
          <div className="mb-4 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name (e.g. Blazer, Curtain)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateCustomCategory}
              className="min-h-[38px] px-3.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setNewCategoryName('');
                setIsAddingCategory(false);
              }}
              className="min-h-[38px] px-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clothing Rows */}
        <div className="divide-y divide-slate-100">
          {categories
            .filter((c) => c.isActive)
            .map((cat) => {
              const qty = quantities[cat.name] || 0;
              const hasQty = qty > 0;

              return (
                <div
                  key={cat.id}
                  className={`py-3 flex items-center justify-between transition-colors ${
                    hasQty ? 'bg-blue-50/30 -mx-2 px-2 rounded-xl' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-semibold truncate ${
                        hasQty ? 'text-blue-900 font-bold' : 'text-slate-800'
                      }`}
                    >
                      {cat.name}
                    </span>
                    {!cat.isDefault && (
                      <span className="text-[10px] text-slate-400 font-normal">custom</span>
                    )}
                  </div>

                  {/* Increment / Decrement & Input Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuantityDelta(cat.name, -1)}
                      disabled={qty === 0}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-transform"
                      aria-label={`Decrease ${cat.name}`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={qty === 0 ? '' : qty}
                      onChange={(e) => handleDirectQuantity(cat.name, e.target.value)}
                      placeholder="0"
                      className={`w-12 h-11 text-center font-mono font-bold text-sm rounded-xl border tabular-nums transition-colors ${
                        hasQty
                          ? 'border-blue-400 bg-white text-blue-900 shadow-xs ring-2 ring-blue-500/10'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />

                    <button
                      type="button"
                      onClick={() => handleQuantityDelta(cat.name, 1)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 active:scale-95 transition-transform"
                      aria-label={`Increase ${cat.name}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancelClick}
            className="flex-1 min-h-[48px] rounded-2xl border border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveRecord}
            disabled={isSaving || totalItems === 0}
            className="flex-1 min-h-[48px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>
              {isSaving
                ? 'Saving...'
                : isEditing
                ? `Update Record (${totalItems})`
                : `Save Laundry (${totalItems})`}
            </span>
          </button>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureComplete={(img) => {
          setChitImageData(img);
          // Suggest OCR scanning directly after capture
          handleTriggerOcr(img);
        }}
      />

      {/* OCR Result Confirmation Modal */}
      {ocrResult && (
        <OCRConfirmationModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          ocrResult={ocrResult}
          onApply={handleApplyOcrResults}
        />
      )}

      {/* Discard Warning Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Discard changes?</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              You have {totalItems} items entered. Discarding will lose this laundry bag.
            </p>
            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onCancel();
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
