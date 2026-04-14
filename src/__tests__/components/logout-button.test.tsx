import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogoutButton } from "@/components/logout-button";

const mockPush = jest.fn();
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
    mockFetch.mockClear();
    mockPush.mockClear();
    mockFetch.mockResolvedValue({ ok: true });
});

describe("LogoutButton", () => {
    it("renders the sign out button", () => {
        render(<LogoutButton />);
        expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("opens the confirmation dialog when clicked", async () => {
        const user = userEvent.setup();
        render(<LogoutButton />);

        await user.click(screen.getByRole("button", { name: /sign out/i }));

        expect(screen.getByText("Sign out?")).toBeInTheDocument();
        expect(screen.getByText(/returned to the sign-in page/i)).toBeInTheDocument();
    });

    it("does not fetch when cancel is clicked", async () => {
        const user = userEvent.setup();
        render(<LogoutButton />);

        await user.click(screen.getByRole("button", { name: /sign out/i }));
        await user.click(screen.getByRole("button", { name: /cancel/i }));

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("POSTs to /api/auth/logout when confirmed", async () => {
        const user = userEvent.setup();
        render(<LogoutButton />);

        await user.click(screen.getByRole("button", { name: /sign out/i }));
        await user.click(screen.getByRole("button", { name: /^sign out$/i }));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
        });
    });

    it("redirects to /login after confirming", async () => {
        const user = userEvent.setup();
        render(<LogoutButton />);

        await user.click(screen.getByRole("button", { name: /sign out/i }));
        await user.click(screen.getByRole("button", { name: /^sign out$/i }));

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/login");
        });
    });
});
