export const DEFAULT_PAGE_SIZE = 10;

export const getSafePage = (value: string | null) => {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
};

export const paginateItems = <T,>(items: T[], page: number, pageSize = DEFAULT_PAGE_SIZE) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalElements: items.length,
  };
};

export const getVisiblePages = (totalPages: number) => {
  if (totalPages <= 6) return Array.from({ length: totalPages }, (_, index) => index + 1);
  return [1, 2, 3, 4, 5, "ellipsis", totalPages] as const;
};
