'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DirectoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export default function DirectoryPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: DirectoryPaginationProps) {
    const autoT = useTranslations();
  if (totalPages <= 1) return null;

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pages = [];
  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  const startItem = totalItems !== undefined && itemsPerPage !== undefined
    ? Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)
    : undefined;
  const endItem = totalItems !== undefined && itemsPerPage !== undefined
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : undefined;

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200/70 px-6 py-5 dark:border-gray-800/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">
        {startItem !== undefined && endItem !== undefined && totalItems !== undefined
          ? `Showing ${startItem}-${endItem} of ${totalItems}`
          : `Page ${currentPage} of ${totalPages}`}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[0.8rem] border border-slate-200/70 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white"
          title={autoT("auto.web.components_DirectoryPagination.k_00265af6")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {startPage > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="inline-flex h-10 min-w-[40px] items-center justify-center rounded-[0.8rem] border border-slate-200/70 bg-white px-3 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
            >
              1
            </button>
            {startPage > 2 ? <span className="px-1 text-slate-400 dark:text-gray-500">...</span> : null}
          </>
        ) : null}

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-[0.8rem] px-3 text-sm font-semibold transition-all ${
              page === currentPage
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-900 dark:shadow-none'
                : 'border border-slate-200/70 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages ? (
          <>
            {endPage < totalPages - 1 ? <span className="px-1 text-slate-400 dark:text-gray-500">...</span> : null}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="inline-flex h-10 min-w-[40px] items-center justify-center rounded-[0.8rem] border border-slate-200/70 bg-white px-3 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
            >
              {totalPages}
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[0.8rem] border border-slate-200/70 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white"
          title={autoT("auto.web.components_DirectoryPagination.k_1d39ec5b")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
