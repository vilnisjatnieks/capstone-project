import {
    parsePageParams,
    buildPaginatedResponse,
    MAX_PAGE_SIZE,
} from "@/lib/pagination";

describe("parsePageParams", () => {
    const sp = (q: string) => new URLSearchParams(q);

    it("defaults to page 1 with default pageSize when no params", () => {
        expect(parsePageParams(sp(""))).toEqual({
            page: 1,
            pageSize: 20,
            offset: 0,
        });
    });

    it("uses provided default pageSize", () => {
        expect(parsePageParams(sp(""), 25)).toEqual({
            page: 1,
            pageSize: 25,
            offset: 0,
        });
    });

    it("parses valid page and pageSize", () => {
        expect(parsePageParams(sp("page=3&pageSize=10"))).toEqual({
            page: 3,
            pageSize: 10,
            offset: 20,
        });
    });

    it("falls back to page 1 when page is zero, negative, or NaN", () => {
        expect(parsePageParams(sp("page=0")).page).toBe(1);
        expect(parsePageParams(sp("page=-5")).page).toBe(1);
        expect(parsePageParams(sp("page=abc")).page).toBe(1);
    });

    it("floors fractional page values", () => {
        expect(parsePageParams(sp("page=2.9")).page).toBe(2);
    });

    it("caps pageSize at MAX_PAGE_SIZE", () => {
        expect(parsePageParams(sp(`pageSize=9999`)).pageSize).toBe(
            MAX_PAGE_SIZE
        );
    });

    it("falls back to default pageSize on invalid values", () => {
        expect(parsePageParams(sp("pageSize=0")).pageSize).toBe(20);
        expect(parsePageParams(sp("pageSize=abc")).pageSize).toBe(20);
        expect(parsePageParams(sp("pageSize=-10")).pageSize).toBe(20);
    });

    it("computes offset from page and pageSize", () => {
        expect(parsePageParams(sp("page=4&pageSize=25")).offset).toBe(75);
    });
});

describe("buildPaginatedResponse", () => {
    it("wraps items with total, page, pageSize", () => {
        const params = { page: 2, pageSize: 10, offset: 10 };
        expect(buildPaginatedResponse([{ id: 1 }, { id: 2 }], 42, params)).toEqual({
            items: [{ id: 1 }, { id: 2 }],
            total: 42,
            page: 2,
            pageSize: 10,
        });
    });
});
