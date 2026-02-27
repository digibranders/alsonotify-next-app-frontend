import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationBar } from './PaginationBar';
import { vi, describe, it, expect } from 'vitest';

describe('PaginationBar Accessibility', () => {
    it('renders with correct aria labels for navigation', () => {
        render(
            <PaginationBar
                currentPage={2}
                totalItems={50}
                pageSize={10}
                onPageChange={vi.fn()}
                onPageSizeChange={vi.fn()}
            />
        );

        // Check for Previous button
        const prevButton = screen.getByRole('button', { name: /go to previous page/i });
        expect(prevButton).toBeInTheDocument();

        // Check for Next button
        const nextButton = screen.getByRole('button', { name: /go to next page/i });
        expect(nextButton).toBeInTheDocument();
    });

    it('marks the current page with aria-current', () => {
        render(
            <PaginationBar
                currentPage={3}
                totalItems={50}
                pageSize={10}
                onPageChange={vi.fn()}
                onPageSizeChange={vi.fn()}
            />
        );

        const currentPageButton = screen.getByRole('button', { name: /3/i });
        expect(currentPageButton).toHaveAttribute('aria-current', 'page');
        expect(currentPageButton).toHaveAttribute('aria-label', 'Current page, page 3');

        const otherPageButton = screen.getByRole('button', { name: /2/i });
        expect(otherPageButton).not.toHaveAttribute('aria-current');
        expect(otherPageButton).toHaveAttribute('aria-label', 'Go to page 2');
    });

    it('has accessible label for page size selector', () => {
        render(
            <PaginationBar
                currentPage={1}
                totalItems={50}
                pageSize={10}
                onPageChange={vi.fn()}
                onPageSizeChange={vi.fn()}
            />
        );

        const select = screen.getByRole('combobox');
        expect(select).toHaveAttribute('aria-label', 'Items per page');
    });

    it('calls onPageChange when a page is clicked', () => {
        const handlePageChange = vi.fn();
        render(
            <PaginationBar
                currentPage={1}
                totalItems={50}
                pageSize={10}
                onPageChange={handlePageChange}
                onPageSizeChange={vi.fn()}
            />
        );

        const page2Button = screen.getByRole('button', { name: /2/i });
        fireEvent.click(page2Button);
        expect(handlePageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageSizeChange when size is changed', () => {
        const handlePageSizeChange = vi.fn();
        render(
            <PaginationBar
                currentPage={1}
                totalItems={50}
                pageSize={10}
                onPageChange={vi.fn()}
                onPageSizeChange={handlePageSizeChange}
            />
        );

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '20' } });
        expect(handlePageSizeChange).toHaveBeenCalledWith(20);
    });
});
