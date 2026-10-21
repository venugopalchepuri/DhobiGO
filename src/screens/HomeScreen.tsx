import React from 'react';
import { Plus, Package, Clock, CheckCircle2, ChevronRight, FileText, Image as ImageIcon, CreditCard, ShieldCheck } from 'lucide-react';
import { IDProofCredential, LaundryItem, LaundryRecord, UserProfile } from '../types';
import { formatLaundryDate } from '../utils/whatsapp';

interface HomeScreenProps {
  records: LaundryRecord[];
  itemsByRecordId: Record<string, LaundryItem[]>;
  idProof: IDProofCredential | null;
  onOpenIDProof: () => void;
  currentUser?: UserProfile | null;
  onOpenProfile?: () => void;
  onAddLaundryClick: () => void;
  onRecordClick: (recordId: string) => void;
  onViewAllHistory: () => void;
  onViewChitPhoto: (imageUrl: string, title: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  records,
  itemsByRecordId,
  idProof,
  onOpenIDProof,
  currentUser,
  onOpenProfile,
  onAddLaundryClick,
  onRecordClick,
  onViewAllHistory,
  onViewChitPhoto,
}) => {
  // Derive real statistics from local records
  const pendingBags = records.filter((r) => r.status === 'pending');
  const partiallyReturnedBags = records.filter((r) => r.status === 'partially_returned');
  const collectedBags = records.filter((r) => r.status === 'collected');

  const activeBagsCount = pendingBags.length + partiallyReturnedBags.length;

  // Compute items awaiting return: total items given - items returned
  let itemsAwaitingReturn = 0;
  records.forEach((record) => {
    if (record.status !== 'collected') {
      const items = itemsByRecordId[record.id] || [];
      const given = items.reduce((s, i) => s + i.quantityGiven, 0);
      const returned = items.reduce((s, i) => s + i.quantityReturned, 0);
      itemsAwaitingReturn += Math.max(0, given - returned);
    }
  });

  const recentRecords = records.slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      {/* Greeting & Quick Action Banner */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            {currentUser && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-emerald-700">
                  Welcome back, {currentUser.fullName.split(' ')[0]}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                  Private Vault
                </span>
              </div>
            )}
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {activeBagsCount > 0
                ? `${activeBagsCount} bag${activeBagsCount === 1 ? '' : 's'} at the dhobi`
                : 'All clothes collected'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {activeBagsCount > 0
                ? `${itemsAwaitingReturn} garments awaiting return from your laundry bags.`
                : 'No active laundry bags outstanding right now.'}
            </p>
          </div>

          <button
            onClick={onAddLaundryClick}
            className="shrink-0 min-h-[44px] px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bag</span>
          </button>
        </div>

        {/* 3 Metrics Strip */}
        <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-2xl">
            <span className="block text-[11px] font-semibold text-slate-500">Active Bags</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                {activeBagsCount}
              </span>
              <span className="text-[10px] text-slate-400">bags</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-2xl">
            <span className="block text-[11px] font-semibold text-amber-700">Awaiting Return</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-amber-900 tabular-nums">
                {itemsAwaitingReturn}
              </span>
              <span className="text-[10px] text-amber-700">items</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-2xl">
            <span className="block text-[11px] font-semibold text-emerald-700">Collected</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-900 tabular-nums">
                {collectedBags.length}
              </span>
              <span className="text-[10px] text-emerald-700">bags</span>
            </div>
          </div>
        </div>

        {/* Discrepancy indicator if partially returned */}
        {partiallyReturnedBags.length > 0 && (
          <div className="mt-3 text-[11px] text-blue-700 font-medium bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-100/80 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {partiallyReturnedBags.length} bag has partial returns logged. Verify missing items before closing.
            </span>
          </div>
        )}

        {/* Counter ID Proof Quick Verification Banner */}
        <div
          onClick={onOpenIDProof}
          className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between cursor-pointer hover:from-slate-800 hover:to-slate-700 active:scale-[0.99] transition-all shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-blue-300 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {idProof ? idProof.fullName : 'ID Proof Card for Dhobi Pickup'}
                </span>
                {idProof && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                    Ready
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {idProof
                  ? `${idProof.idType} (${idProof.idNumber}) · Tap to Show`
                  : 'Tap to add your ID card for counter verification'}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-xs font-semibold text-blue-300 flex items-center gap-0.5 ml-2">
            <span>{idProof ? 'Show' : 'Set Up'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Recent Laundry Records Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Laundry Bags</h3>
          {records.length > 0 && (
            <button
              onClick={onViewAllHistory}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 active:scale-95 transition-transform"
            >
              <span>View All ({records.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {records.length === 0 ? (
          /* Clean Empty State */
          <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3.5">
              <Package className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h4 className="text-base font-bold text-slate-900">No laundry records yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Record clothes handed to your dhobi, keep the paper chit photo safe, and send a neat WhatsApp count.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-5">
              <button
                onClick={onAddLaundryClick}
                className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Record New Bag</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRecords.map((record) => {
              const items = itemsByRecordId[record.id] || [];
              const returnedCount = items.reduce((s, i) => s + i.quantityReturned, 0);

              return (
                <div
                  key={record.id}
                  onClick={() => onRecordClick(record.id)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Chit Photo Thumbnail or Icon */}
                      {record.chitImageData ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewChitPhoto(
                              record.chitImageData!,
                              `Slip ${record.slipNumber || record.id}`
                            );
                          }}
                          title="Tap to zoom chit slip"
                          className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative group/thumb cursor-zoom-in"
                        >
                          <img
                            src={record.chitImageData}
                            alt="Slip thumbnail"
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 shrink-0 flex items-center justify-center border border-slate-200/70">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                      )}

                      {/* Record Main Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {record.id}
                          </span>
                          {record.slipNumber && (
                            <span className="text-xs text-slate-500 font-medium">
                              · Slip #{record.slipNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span>{formatLaundryDate(record.dateGiven)}</span>
                          {record.dhobiName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[130px] font-medium text-slate-600">
                                {record.dhobiName}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Top items preview */}
                        {items.length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-1 truncate max-w-xs">
                            {items
                              .filter((i) => i.quantityGiven > 0)
                              .slice(0, 3)
                              .map((i) => `${i.quantityGiven} ${i.category}`)
                              .join(', ')}
                            {items.length > 3 ? ` +${items.length - 3} more` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Status & Total */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        {record.status === 'collected' ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Collected</span>
                          </span>
                        ) : record.status === 'partially_returned' ? (
                          <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {returnedCount}/{record.totalItems} Ret.
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="mt-1">
                        <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {record.totalItems}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">items</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
