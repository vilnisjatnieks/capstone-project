import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeSearchBar } from "@/components/home-search-bar";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
    mockPush.mockClear();
});

describe("HomeSearchBar", () => {
    it("renders search input and submit button", () => {
        render(<HomeSearchBar />);
        expect(screen.getByPlaceholderText("Search by title, publisher, editor, ISBN, or LCCN...")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    });

    it("navigates to /search?q=... when submitted with a query", async () => {
        const user = userEvent.setup();
        render(<HomeSearchBar />);

        await user.type(screen.getByPlaceholderText("Search by title, publisher, editor, ISBN, or LCCN..."), "social work");
        await user.click(screen.getByRole("button", { name: /search/i }));

        expect(mockPush).toHaveBeenCalledWith("/search?q=social%20work");
    });

    it("navigates to /search with no query when submitted empty", async () => {
        const user = userEvent.setup();
        render(<HomeSearchBar />);

        await user.click(screen.getByRole("button", { name: /search/i }));

        expect(mockPush).toHaveBeenCalledWith("/search");
    });
});
