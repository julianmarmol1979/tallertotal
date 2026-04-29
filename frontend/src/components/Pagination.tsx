"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [5, 10, 25, 50, 100] as const;

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-1">
      {/* Left: count info */}
      <span className="text-xs text-gray-400 select-none">
        {total === 0 ? "0 resultados" : `${from}–${to} de ${total}`}
      </span>

      {/* Center: prev · page-size selector · next */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1 px-1">
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 hover:border-gray-300 transition-colors"
            aria-label="Filas por página"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} por pág.</option>
            ))}
          </select>

          <span className="text-xs text-gray-400 whitespace-nowrap px-1 select-none">
            {totalPages > 1 ? `pág. ${page} / ${totalPages}` : ""}
          </span>
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
