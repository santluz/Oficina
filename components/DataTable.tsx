
import React from 'react';
import { COLORS, Search, Plus } from '../constants';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onAdd?: () => void;
  addButtonLabel?: string;
  title: string;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id: string | number }>({ 
  columns, 
  data, 
  onAdd, 
  addButtonLabel = 'Adicionar', 
  title,
  searchPlaceholder = 'Buscar...'
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredData = data.filter(item => {
    const values = Object.values(item).map(val => String(val).toLowerCase());
    return values.some(val => val.includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">{title}</h2>
          <p className="text-zinc-500 text-sm">{data.length} registros encontrados</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className={`pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-${COLORS.primary}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {onAdd && (
            <button
              onClick={onAdd}
              className={`flex items-center gap-2 px-4 py-2 bg-${COLORS.primary} hover:bg-${COLORS.primaryHover} text-white text-sm font-semibold rounded-lg transition-all`}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{addButtonLabel}</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950/50 border-b border-zinc-800">
              {columns.map((col, idx) => (
                <th key={idx} className={`px-6 py-4 text-sm font-semibold text-zinc-400 ${col.className}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors group">
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-6 py-4 text-sm text-zinc-300 ${col.className}`}>
                      {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-500 italic">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
