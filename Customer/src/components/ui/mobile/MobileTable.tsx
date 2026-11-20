import React from 'react';

export interface MobileTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  primary?: boolean; // Used as main card header on mobile
}

export interface MobileTableProps<T> {
  data: T[];
  columns: MobileTableColumn<T>[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function MobileTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No records found',
  onRowClick,
  className = '',
}: MobileTableProps<T>) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-purple-200/80 bg-[#FAF7FF] p-8 text-center text-xs font-bold text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  const primaryCol = columns.find(c => c.primary) || columns[0];
  const otherCols = columns.filter(c => c !== primaryCol);

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Card Layout (< 768px) */}
      <div className="block md:hidden space-y-2.5">
        {data.map(item => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={`rounded-2xl border border-purple-100/90 bg-white p-3.5 shadow-2xs space-y-2 transition ${
              onRowClick ? 'cursor-pointer hover:border-purple-300 active:scale-[0.99]' : ''
            }`}
          >
            {/* Primary header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-50 font-black text-slate-900 text-xs sm:text-sm">
              <span className="text-[11px] font-semibold text-slate-400">
                {primaryCol.header}
              </span>
              <div>
                {primaryCol.render ? primaryCol.render(item) : item[primaryCol.key]}
              </div>
            </div>

            {/* Other fields */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {otherCols.map(col => (
                <div key={col.key} className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {col.header}
                  </div>
                  <div className="font-semibold text-slate-800 text-xs truncate">
                    {col.render ? col.render(item) : item[col.key]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout (>= 768px) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-purple-100/90 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7FF] border-b border-purple-100/80 text-[11px] font-extrabold uppercase tracking-wider text-[#3B0764]">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(item => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`transition hover:bg-purple-50/30 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-slate-800 font-medium ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
