import { render, screen, fireEvent } from "@testing-library/react";
import { PaginationControls } from "@/components/pagination-controls";

describe("PaginationControls", () => {
    it("renders nothing when total is zero", () => {
        const { container } = render(
            <PaginationControls
                page={1}
                pageSize={20}
                total={0}
                onPageChange={jest.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders nothing when total <= pageSize (single page)", () => {
        const { container } = render(
            <PaginationControls
                page={1}
                pageSize={20}
                total={15}
                onPageChange={jest.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it("disables Previous on page 1", () => {
        render(
            <PaginationControls
                page={1}
                pageSize={20}
                total={100}
                onPageChange={jest.fn()}
            />
        );
        expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    });

    it("disables Next on last page", () => {
        render(
            <PaginationControls
                page={5}
                pageSize={20}
                total={100}
                onPageChange={jest.fn()}
            />
        );
        expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("calls onPageChange with next page when Next clicked", () => {
        const onPageChange = jest.fn();
        render(
            <PaginationControls
                page={2}
                pageSize={20}
                total={100}
                onPageChange={onPageChange}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("calls onPageChange with previous page when Previous clicked", () => {
        const onPageChange = jest.fn();
        render(
            <PaginationControls
                page={3}
                pageSize={20}
                total={100}
                onPageChange={onPageChange}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /previous/i }));
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("renders numbered page buttons and jumps when clicked", () => {
        const onPageChange = jest.fn();
        render(
            <PaginationControls
                page={1}
                pageSize={20}
                total={60}
                onPageChange={onPageChange}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: "3" }));
        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("marks current page button as active (aria-current)", () => {
        render(
            <PaginationControls
                page={2}
                pageSize={20}
                total={100}
                onPageChange={jest.fn()}
            />
        );
        expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
            "aria-current",
            "page"
        );
    });
});
