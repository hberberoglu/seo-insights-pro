
import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortKey?: string; // Key used for sorting in backend/logic
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  onSort?: (key: string) => void;
  currentSort?: { col: string; dir: 'ASC' | 'DESC' };
}

export const DataTable = <T,>({ data, columns, onRowClick, onSort, currentSort }: DataTableProps<T>) => {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col, idx) => {
              const isSorted = currentSort?.col === col.sortKey;
              return (
                <th
                  key={idx}
                  onClick={() => col.sortKey && onSort && onSort(col.sortKey)}
                  className={`px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider ${col.className} ${col.sortKey ? 'cursor-pointer hover:bg-slate-100 transition-colors group' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortKey && (
                      <span className={`text-[10px] transition-opacity ${isSorted ? 'opacity-100 text-indigo-600' : 'opacity-0 group-hover:opacity-50'}`}>
                        {isSorted ? (currentSort?.dir === 'ASC' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((item, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick && onRowClick(item)}
              className={onRowClick ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-6 py-4 whitespace-nowrap text-sm text-slate-600 ${col.className}`}>
                  {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as any)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-slate-400 font-medium">
                Bu seçim için veri bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
