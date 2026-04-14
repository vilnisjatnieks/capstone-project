import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HoldWorkButton } from "@/app/works/[id]/hold-work-button";

const mockRefresh = jest.fn();
const mockFetch = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
global.fetch = mockFetch;

jest.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock("sonner", () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
    },
}));

beforeEach(() => {
    mockFetch.mockClear();
    mockRefresh.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe("HoldWorkButton — none status", () => {
    it("renders Request Hold button", () => {
        render(<HoldWorkButton workId="w1" holdStatus="none" />);
        expect(screen.getByRole("button", { name: /request hold/i })).toBeInTheDocument();
    });

    it("POSTs directly on click without a confirmation dialog", async () => {
        const user = userEvent.setup();
        render(<HoldWorkButton workId="w1" holdStatus="none" />);

        await user.click(screen.getByRole("button", { name: /request hold/i }));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith("/api/works/w1/hold", { method: "POST" });
        });
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows a success toast on successful request", async () => {
        const user = userEvent.setup();
        render(<HoldWorkButton workId="w1" holdStatus="none" />);

        await user.click(screen.getByRole("button", { name: /request hold/i }));

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith("Hold requested");
        });
    });

    it("shows an error toast when request hold fails", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Already on hold" }),
        });
        render(<HoldWorkButton workId="w1" holdStatus="none" />);

        await user.click(screen.getByRole("button", { name: /request hold/i }));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith("Already on hold");
        });
    });
});

describe("HoldWorkButton — own status", () => {
    it("renders Remove Hold button", () => {
        render(<HoldWorkButton workId="w1" holdStatus="own" />);
        expect(screen.getByRole("button", { name: /remove hold/i })).toBeInTheDocument();
    });

    it("opens confirmation dialog on click", async () => {
        const user = userEvent.setup();
        render(<HoldWorkButton workId="w1" holdStatus="own" />);

        await user.click(screen.getByRole("button", { name: /remove hold/i }));

        expect(screen.getByText("Remove hold?")).toBeInTheDocument();
    });

    it("does not fetch when cancel is clicked", async () => {
        const user = userEvent.setup();
        render(<HoldWorkButton workId="w1" holdStatus="own" />);

        await user.click(screen.getByRole("button", { name: /remove hold/i }));
        await user.click(screen.getByRole("button", { name: /cancel/i }));

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("DELETEs the hold when confirmed", async () => {
        const user = userEvent.setup();
        render(<HoldWorkButton workId="w1" holdStatus="own" />);

        await user.click(screen.getByRole("button", { name: /remove hold/i }));
        await user.click(screen.getByRole("button", { name: /^remove hold$/i }));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith("/api/works/w1/hold", { method: "DELETE" });
        });
    });

    it("shows a success toast after remove", async () => {
        const user = userEvent.setup();
        render(<HoldWorkButton workId="w1" holdStatus="own" />);

        await user.click(screen.getByRole("button", { name: /remove hold/i }));
        await user.click(screen.getByRole("button", { name: /^remove hold$/i }));

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith("Hold removed");
        });
    });

    it("does not toast when DELETE fails", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Hold not found" }),
        });
        render(<HoldWorkButton workId="w1" holdStatus="own" />);

        await user.click(screen.getByRole("button", { name: /remove hold/i }));
        await user.click(screen.getByRole("button", { name: /^remove hold$/i }));

        await waitFor(() => {
            expect(screen.getByText("Hold not found")).toBeInTheDocument();
        });
        expect(mockToastSuccess).not.toHaveBeenCalled();
    });

    it("shows error in dialog when DELETE fails", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Hold not found" }),
        });
        render(<HoldWorkButton workId="w1" holdStatus="own" />);

        await user.click(screen.getByRole("button", { name: /remove hold/i }));
        await user.click(screen.getByRole("button", { name: /^remove hold$/i }));

        await waitFor(() => {
            expect(screen.getByText("Hold not found")).toBeInTheDocument();
        });
    });
});

describe("HoldWorkButton — other status", () => {
    it("renders disabled On Hold button with holder name", () => {
        render(<HoldWorkButton workId="w1" holdStatus="other" holdUserName="Jane" />);
        const btn = screen.getByRole("button", { name: /on hold by jane/i });
        expect(btn).toBeDisabled();
    });
});
