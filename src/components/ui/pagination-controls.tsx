import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVisiblePages } from "@/lib/pagination";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export const PaginationControls = ({ page, totalPages, onPageChange, className = "" }: PaginationControlsProps) => {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(totalPages);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav className={`flex flex-wrap items-center justify-center gap-2 pt-4 ${className}`} aria-label="Pagination">
      <Button type="button" variant="outline" size="icon" aria-label="Trang đầu" disabled={isFirstPage} onClick={() => onPageChange(1)}>
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" aria-label="Trang trước" disabled={isFirstPage} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((item) =>
        item === "ellipsis" ? (
          <span key="ellipsis" className="px-2 text-sm text-muted-foreground">...</span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === page ? "default" : "outline"}
            size="icon"
            aria-label={`Trang ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ),
      )}

      <Button type="button" variant="outline" size="icon" aria-label="Trang sau" disabled={isLastPage} onClick={() => onPageChange(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" aria-label="Trang cuối" disabled={isLastPage} onClick={() => onPageChange(totalPages)}>
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </nav>
  );
};
