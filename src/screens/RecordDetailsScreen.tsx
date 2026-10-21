import React, { useState } from 'react';
import {
  Share2,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ZoomIn,
  Minus,
  Plus,
  Send,
  Calendar,
  IndianRupee,
  StickyNote,
  Sun,
  CheckCheck,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { IDProofCredential, LaundryItem, LaundryRecord } from '../types';
import { formatLaundryDate, shareLaundryRecord } from '../utils/whatsapp';

interface RecordDetailsScreenProps {
  record: LaundryRecord;
  items: LaundryItem[];
  idProof?: IDProofCredential | null;
  onOpenIDProof?: () => void;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (recordId: string) => Promise<void>;
  onUpdateItemReturn: (itemId: string, newReturnedQty: number) => Promise<void>;
  onMarkAllReturned: () => Promise<void>;
  onForceMarkCollected: () => Promise<void>;
  onOpenChitViewer: (imageUrl: string, title: string) => void;
}

export const RecordDetailsScreen: React.FC<RecordDetailsScreenProps> = ({
  record,
  items,
  idProof,
  onOpenIDProof,
  onBack,
  onEdit,
  onDelete,
  onUpdateItemReturn,
  onMarkAllReturned,
  onForceMarkCollected,
  onOpenChitViewer,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const totalGiven = items.reduce((s, i) => s + i.quantityGiven, 0);
  const totalReturned = items.reduce((s, i) => s + i.quantityReturned, 0);
  const totalOutstanding = Math.max(0, totalGiven - totalReturned);

  const handleQuickCollectAll = async () => {
    await onMarkAllReturned();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleShareClick = async () => {
    const result = await shareLaundryRecord(record, items);
    if (result.method === 'clipboard') {
      setShareFeedback('Formatted inventory copied to clipboard!');
      setTimeout(() => setShareFeedback(null), 3500);
    } else if (result.method === 'native_share') {
      setShareFeedback('Shared via system share sheet.');
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    await onDelete(record.id);
    setShowDeleteModal(false);
    onBack();
  };

  const handleMarkCollectedWithMissing = async () => {
    if (totalOutstanding > 0) {
      setShowDiscrepancyModal(true);
    } else {
      await handleQuickCollectAll();
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-150">
      {/* Top Summary Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {record.id}
              </span>
              {record.slipNumber && (
                <span className="text-xs font-semibold text-slate-700">
                  Slip #{record.slipNumber}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {record.dhobiName || 'Dhobi Laundry Bag'}
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Given: {formatLaundryDate(record.dateGiven)}</span>
              {record.expectedReturnDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Expected: {formatLaundryDate(record.expectedReturnDate)}</span>
                </>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 text-right">
            {record.status === 'collected' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Collected</span>
              </span>
            ) : record.status === 'partially_returned' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Partially Returned</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <span>Pending Return</span>
              </span>
            )}

            <div className="mt-1.5 font-mono text-xs font-bold text-slate-700">
              {totalReturned} / {totalGiven} items returned
            </div>
          </div>
        </div>

        {/* Amount & Notes metadata strip if present */}
        {(record.amount || record.notes) && (
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-600">
            {record.amount && record.amount > 0 && (
              <div className="flex items-center gap-1 font-semibold text-slate-900">
                <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                <span>₹{record.amount} charges</span>
              </div>
            )}
            {record.notes && (
              <div className="flex items-center gap-1 text-slate-500">
                <StickyNote className="w-3.5 h-3.5 text-slate-400" />
                <span className="italic">{record.notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Share Feedback Toast */}
        {shareFeedback && (
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-800 text-center animate-in fade-in">
            {shareFeedback}
          </div>
        )}
      </div>

      {/* Primary Action: Original Chit Slip Presentation */}
      {record.chitImageData && (
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Original Paper Slip (Chit)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ready to show dhobi as physical verification proof
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner group">
            <img
              src={record.chitImageData}
              alt="Original Chit Slip"
              className="w-full h-52 object-contain bg-slate-950/80"
            />

            {/* Overlay Action Buttons */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2">
              <span className="text-xs text-white/90 font-medium truncate">
                Slip #{record.slipNumber || record.id}
              </span>

              <button
                onClick={() =>
                  onOpenChitViewer(
                    record.chitImageData!,
                    `Slip ${record.slipNumber || record.id}`
                  )
                }
                className="min-h-[40px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all"
              >
                <Sun className="w-4 h-4 text-amber-300" />
                <span>Show to Dhobi (Zoom)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Proof Verification Credential Section */}
      {onOpenIDProof && (
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-blue-300 flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {idProof ? idProof.idType : 'ID Proof Card'}
                  </h3>
                  {idProof && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Ready
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {idProof
                    ? `${idProof.fullName} · ${idProof.idNumber}`
                    : 'Dhobi or counter asks for ID before returning clothes'}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenIDProof}
              className="min-h-[40px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all shrink-0 ml-2"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-300" />
              <span>{idProof ? 'Show ID' : 'Add ID Card'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Item-Level Collection & Return Tracking */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Collection & Items Tracking</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify garments as the dhobi hands them back
            </p>
          </div>

          {totalOutstanding > 0 && (
            <button
              onClick={handleQuickCollectAll}
              className="min-h-[38px] px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 active:scale-95 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Returned</span>
            </button>
          )}
        </div>

        {/* Outstanding Alert Bar */}
        {totalOutstanding > 0 && (
          <div className="mb-4 p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-medium text-amber-900">
                <span className="font-bold">{totalOutstanding} items</span> still awaiting return
              </span>
            </div>

            <button
              onClick={handleMarkCollectedWithMissing}
              className="text-xs font-semibold text-amber-800 underline hover:text-amber-900"
            >
              Close bag anyway
            </button>
          </div>
        )}

        {/* Item Rows */}
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const outstanding = item.quantityGiven - item.quantityReturned;
            const isComplete = outstanding === 0;

            return (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold truncate ${
                        isComplete ? 'text-slate-500 line-through' : 'text-slate-900'
                      }`}
                    >
                      {item.category}
                    </span>
                    {isComplete && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Returned
                      </span>
                    )}
                  </div>

                  {/* Explicit breakdown: Given, Returned, Outstanding */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>Given: {item.quantityGiven}</span>
                    <span aria-hidden="true">·</span>
                    <span>Returned: {item.quantityReturned}</span>
                    {outstanding > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold text-amber-700">Missing: {outstanding}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Return Steppers */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onUpdateItemReturn(item.id, item.quantityReturned - 1)}
                    disabled={item.quantityReturned <= 0}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-transform"
                    aria-label={`Decrease returned ${item.category}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-9 text-center font-mono font-bold text-xs text-slate-900 tabular-nums">
                    {item.quantityReturned}
                  </span>

                  <button
                    onClick={() => onUpdateItemReturn(item.id, item.quantityReturned + 1)}
                    disabled={item.quantityReturned >= item.quantityGiven}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-transform"
                    aria-label={`Increase returned ${item.category}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Action Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {/* WhatsApp Share Button */}
          <button
            onClick={handleShareClick}
            className="flex-1 min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/25 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Share to WhatsApp</span>
          </button>

          {/* Edit Button */}
          <button
            onClick={onEdit}
            className="min-h-[48px] px-3.5 rounded-2xl border border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1.5"
            title="Edit Laundry Record"
          >
            <Edit className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="min-h-[48px] px-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center"
            title="Delete Record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Discrepancy Confirmation Modal */}
      {showDiscrepancyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 text-center">
              Items still missing ({totalOutstanding})
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed text-center">
              There are {totalOutstanding} garments that have not been marked as returned. Do you still wish to close and mark this bag as Collected?
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-left text-xs text-slate-600 max-h-36 overflow-y-auto">
              <span className="font-bold text-slate-800 block mb-1">Unreturned items:</span>
              {items
                .filter((i) => i.quantityGiven > i.quantityReturned)
                .map((i) => (
                  <div key={i.id} className="flex justify-between py-0.5">
                    <span>{i.category}</span>
                    <span className="font-mono font-bold text-amber-700">
                      {i.quantityGiven - i.quantityReturned} missing
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => setShowDiscrepancyModal(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                Keep Pending
              </button>
              <button
                onClick={async () => {
                  setShowDiscrepancyModal(false);
                  await onForceMarkCollected();
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
              >
                Confirm Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Delete this record?</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This will permanently delete record <span className="font-mono font-bold">{record.id}</span> and its attached chit photo. This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
