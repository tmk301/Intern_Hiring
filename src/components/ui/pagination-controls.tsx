import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVisiblePages } from "@/lib/pagination";

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
};

export const PaginationControls = ({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  className = "",
}: PaginationControlsProps) => {
  const { t } = useTranslation();
  const showPageSize = pageSize !== undefined && onPageSizeChange !== undefined;

  if (totalPages <= 1 && !showPageSize) return null;

  const pages = getVisiblePages(totalPages);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <div className={`flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      {showPageSize ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("common.itemsPerPage")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-9 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <span />
      )}

      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
          <Button type="button" variant="outline" size="icon" aria-label={t("common.firstPage")} disabled={isFirstPage} onClick={() => onPageChange(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={t("common.previousPage")} disabled={isFirstPage} onClick={() => onPageChange(page - 1)}>
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

          <Button type="button" variant="outline" size="icon" aria-label={t("common.nextPage")} disabled={isLastPage} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={t("common.lastPage")} disabled={isLastPage} onClick={() => onPageChange(totalPages)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
};
