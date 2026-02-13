
import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}

export const DataTable = <T,>({ data, columns, onRowClick }: DataTableProps<T>) => {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${col.className}`}
              >
                {col.header}
              </th>
            ))}
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
              <td colSpan={columns.length} className="px-6 py-10 text-center text-slate-400">
                No data available for this selection.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
