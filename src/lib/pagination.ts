export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationParams {
    page: number;
    pageSize: number;
    offset: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export function parsePageParams(
    searchParams: URLSearchParams,
    defaultPageSize: number = DEFAULT_PAGE_SIZE
): PaginationParams {
    const rawPage = Number(searchParams.get("page") ?? "1");
    const rawSize = Number(searchParams.get("pageSize") ?? defaultPageSize);
    const page =
        Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const pageSize =
        Number.isFinite(rawSize) && rawSize >= 1
            ? Math.min(Math.floor(rawSize), MAX_PAGE_SIZE)
            : defaultPageSize;
    return { page, pageSize, offset: (page - 1) * pageSize };
}

export function buildPaginatedResponse<T>(
    items: T[],
    total: number,
    params: PaginationParams
): PaginatedResponse<T> {
    return {
        items,
        total,
        page: params.page,
        pageSize: params.pageSize,
    };
}
