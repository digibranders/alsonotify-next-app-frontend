import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    itemLabel?: string;
    className?: string;
}

export function PaginationBar({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    itemLabel = 'items',
    className = ''
}: PaginationBarProps) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    return (
        <div className={`mt-2 pt-2 flex items-center justify-between border-t border-[#EEEEEE] h-10 ${className}`}>
            <p className="text-xs font-normal text-[#666666] leading-none flex items-center h-full">
                {Math.min(startIndex + 1, totalItems)}-{endIndex} of {totalItems} {itemLabel}
            </p>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                    className="w-7 h-7 rounded-lg border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F7F7F7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-1"
                >
                    <ChevronLeft className="w-3.5 h-3.5 text-[#666666]" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;

                    if (totalPages <= 5) {
                        pageNum = i + 1;
                    } else if (currentPage <= 3) {
                        pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                    } else {
                        pageNum = currentPage - 2 + i;
                    }

                    const isCurrent = currentPage === pageNum;

                    return (
                        <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            aria-label={isCurrent ? `Current page, page ${pageNum}` : `Go to page ${pageNum}`}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all font-semibold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-1 ${isCurrent
                                ? 'bg-[#ff3b3b] text-white'
                                : 'border border-[#EEEEEE] text-[#666666] hover:bg-[#F7F7F7]'
                                }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Go to next page"
                    className="w-7 h-7 rounded-lg border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F7F7F7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-1"
                >
                    <ChevronRight className="w-3.5 h-3.5 text-[#666666]" />
                </button>

                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    aria-label="Items per page"
                    className="ml-2 px-2 py-0.5 h-7 rounded-lg border border-[#EEEEEE] text-xs font-normal text-[#666666] bg-white hover:bg-[#F7F7F7] hover:border-[#EEEEEE] focus:outline-none focus:border-[#ff3b3b] focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-1 transition-colors cursor-pointer"
                >
                    <option value={10}>10</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            </div>
        </div>
    );
}
