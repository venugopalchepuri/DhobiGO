import React, { useState, useMemo } from 'react';
import { Search, Filter, X, FileText, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { LaundryItem, LaundryRecord, LaundryStatus } from '../types';
import { formatLaundryDate } from '../utils/whatsapp';

interface HistoryScreenProps {
  records: LaundryRecord[];
  itemsByRecordId: Record<string, LaundryItem[]>;
  onSelectRecord: (recordId: string) => void;
  onViewChitPhoto: (imageUrl: string, title: string) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  records,
  itemsByRecordId,
  onSelectRecord,
  onViewChitPhoto,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LaundryStatus | 'all'>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | '30days' | 'thisMonth'>('all');

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // 1. Status Filter
      if (selectedStatus !== 'all' && record.status !== selectedStatus) {
        return false;
      }

      // 2. Date Filter
      if (selectedDateFilter !== 'all') {
        const recordDate = new Date(record.dateGiven);
        const now = new Date();

        if (selectedDateFilter === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (recordDate < thirtyDaysAgo) return false;
        } else if (selectedDateFilter === 'thisMonth') {
          if (
            recordDate.getMonth() !== now.getMonth() ||
            recordDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      // 3. Search Query (ID, slipNumber, dhobiName, notes, or clothing category names)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = record.id.toLowerCase().includes(q);
        const matchesSlip = record.slipNumber?.toLowerCase().includes(q);
        const matchesDhobi = record.dhobiName?.toLowerCase().includes(q);
        const matchesNotes = record.notes?.toLowerCase().includes(q);

        const items = itemsByRecordId[record.id] || [];
        const matchesItems = items.some((i) => i.category.toLowerCase().includes(q));

        return matchesId || matchesSlip || matchesDhobi || matchesNotes || matchesItems;
      }

      return true;
    });
  }, [records, itemsByRecordId, searchQuery, selectedStatus, selectedDateFilter]);

  const hasActiveFilters = searchQuery !== '' || selectedStatus !== 'all' || selectedDateFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedDateFilter('all');
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-150">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search slip #, bag ID, dhobi name, shirts..."
          className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs (Interactive Segmented Buttons) */}
      <div className="space-y-2">
        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            All Bags ({records.length})
          </button>

          <button
            onClick={() => setSelectedStatus('pending')}
            className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-200/80 hover:bg-amber-50'
            }`}
          >
            Pending ({records.filter((r) => r.status === 'pending').length})
          </button>

          <button
            onClick={() => setSelectedStatus('partially_returned')}
            className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStatus === 'partially_returned'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-blue-700 border border-blue-200/80 hover:bg-blue-50'
            }`}
          >
            Partial ({records.filter((r) => r.status === 'partially_returned').length})
          </button>

          <button
            onClick={() => setSelectedStatus('collected')}
            className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStatus === 'collected'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-200/80 hover:bg-emerald-50'
            }`}
          >
            Collected ({records.filter((r) => r.status === 'collected').length})
          </button>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Date:</span>
            <button
              onClick={() => setSelectedDateFilter('all')}
              className={`text-[11px] font-semibold hover:text-slate-900 ${
                selectedDateFilter === 'all' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              All Time
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => setSelectedDateFilter('thisMonth')}
              className={`text-[11px] font-semibold hover:text-slate-900 ${
                selectedDateFilter === 'thisMonth' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              This Month
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => setSelectedDateFilter('30days')}
              className={`text-[11px] font-semibold hover:text-slate-900 ${
                selectedDateFilter === '30days' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              Past 30 Days
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No matching laundry records</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            {hasActiveFilters
              ? 'Try adjusting your search keywords or clearing status filters.'
              : 'No laundry records have been added yet.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const items = itemsByRecordId[record.id] || [];
            const returnedCount = items.reduce((s, i) => s + i.quantityReturned, 0);

            return (
              <div
                key={record.id}
                onClick={() => onSelectRecord(record.id)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all cursor-pointer active:scale-[0.99] group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Chit Photo Thumbnail */}
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
                          alt="Chit thumbnail"
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 shrink-0 flex items-center justify-center border border-slate-200/60">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {record.id}
                        </span>
                        {record.slipNumber && (
                          <span className="text-xs text-slate-600 font-medium">
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

                      {/* Item Preview */}
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

                  {/* Status & Total */}
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

                    <div className="mt-1 flex items-center justify-end gap-1 text-slate-900">
                      <span className="font-mono text-sm font-bold tabular-nums">
                        {record.totalItems}
                      </span>
                      <span className="text-[11px] text-slate-400">items</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-0.5 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
