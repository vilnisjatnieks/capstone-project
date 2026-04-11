import { render, screen } from "@testing-library/react";
import { TableSkeleton } from "@/components/table-skeleton";

describe("TableSkeleton", () => {
    it("renders the default number of rows", () => {
        const { container } = render(<TableSkeleton columns={3} />);
        const bodyRows = container.querySelectorAll("tbody tr");
        expect(bodyRows).toHaveLength(6);
    });

    it("renders the specified number of rows", () => {
        const { container } = render(<TableSkeleton columns={3} rows={4} />);
        const bodyRows = container.querySelectorAll("tbody tr");
        expect(bodyRows).toHaveLength(4);
    });

    it("renders the correct number of cells per row matching columns", () => {
        const { container } = render(<TableSkeleton columns={5} rows={2} />);
        const rows = container.querySelectorAll("tbody tr");
        rows.forEach((row) => {
            expect(row.querySelectorAll("td")).toHaveLength(5);
        });
    });

    it("renders header text when headers are provided", () => {
        render(<TableSkeleton columns={2} headers={["Title", "Author"]} />);
        expect(screen.getByText("Title")).toBeInTheDocument();
        expect(screen.getByText("Author")).toBeInTheDocument();
    });

    it("applies animate-pulse class to skeleton cells", () => {
        const { container } = render(<TableSkeleton columns={2} rows={1} />);
        const pulsingElements = container.querySelectorAll(".animate-pulse");
        expect(pulsingElements.length).toBeGreaterThan(0);
    });
});
