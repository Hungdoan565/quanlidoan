import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Table.css';

/**
 * Table Component
 */
function Table({ children, className, ...props }) {
    return (
        <div className="table-container">
            <table className={cn('table', className)} {...props}>
                {children}
            </table>
        </div>
    );
}

function TableHeader({ children, className, ...props }) {
    return (
        <thead className={cn('table-header', className)} {...props}>
            {children}
        </thead>
    );
}

function TableBody({ children, className, ...props }) {
    return (
        <tbody className={cn('table-body', className)} {...props}>
            {children}
        </tbody>
    );
}

function TableRow({ children, className, clickable, selected, ...props }) {
    return (
        <tr 
            className={cn(
                'table-row',
                clickable && 'table-row-clickable',
                selected && 'table-row-selected',
                className
            )} 
            {...props}
        >
            {children}
        </tr>
    );
}

function TableHead({ children, className, sortable, sorted, sortDirection, ...props }) {
    return (
        <th 
            className={cn(
                'table-head',
                sortable && 'table-head-sortable',
                sorted && 'table-head-sorted',
                className
            )} 
            {...props}
        >
            <div className="table-head-content">
                {children}
                {sortable && (
                    <span className="table-sort-icon">
                        {sorted ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                )}
            </div>
        </th>
    );
}

function TableCell({ children, className, ...props }) {
    return (
        <td className={cn('table-cell', className)} {...props}>
            {children}
        </td>
    );
}

/**
 * Pagination Component
 */
function Pagination({ 
    currentPage, 
    totalPages, 
    onPageChange,
    totalItems,
    itemsPerPage,
    showInfo = true,
}) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const canGoPrev = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    // Generate page numbers
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="pagination">
            {showInfo && (
                <span className="pagination-info">
                    Hiển thị {startItem}-{endItem} của {totalItems}
                </span>
            )}
            
            <div className="pagination-controls">
                <button 
                    className="pagination-btn"
                    onClick={() => onPageChange(1)}
                    disabled={!canGoPrev}
                    title="Trang đầu"
                >
                    <ChevronsLeft size={16} />
                </button>
                
                <button 
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canGoPrev}
                    title="Trang trước"
                >
                    <ChevronLeft size={16} />
                </button>
                
                <div className="pagination-pages">
                    {getPageNumbers().map((page, idx) => (
                        page === '...' ? (
                            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                        ) : (
                            <button
                                key={page}
                                className={cn('pagination-page', currentPage === page && 'active')}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </button>
                        )
                    ))}
                </div>
                
                <button 
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canGoNext}
                    title="Trang sau"
                >
                    <ChevronRight size={16} />
                </button>
                
                <button 
                    className="pagination-btn"
                    onClick={() => onPageChange(totalPages)}
                    disabled={!canGoNext}
                    title="Trang cuối"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination };
