import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteWorkDialog } from "@/app/staff/delete-work-dialog";
import { DeleteTagDialog } from "@/app/staff/delete-tag-dialog";

const mockFetch = jest.fn();
const mockToastSuccess = jest.fn();
global.fetch = mockFetch;

jest.mock("sonner", () => ({
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
    },
}));

beforeEach(() => {
    mockFetch.mockClear();
    mockToastSuccess.mockClear();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe("DeleteWorkDialog toast", () => {
    it("toasts on successful delete", async () => {
        const user = userEvent.setup();
        const onDeleted = jest.fn();
        render(
            <DeleteWorkDialog
                open={true}
                onOpenChange={() => {}}
                work={{ id: "w1", title: "My Book" }}
                onDeleted={onDeleted}
            />
        );

        await user.click(screen.getByRole("button", { name: /delete/i }));

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith('"My Book" deleted');
        });
    });

    it("does not toast when delete fails", async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Work in use" }),
        });
        render(
            <DeleteWorkDialog
                open={true}
                onOpenChange={() => {}}
                work={{ id: "w1", title: "My Book" }}
                onDeleted={jest.fn()}
            />
        );

        await user.click(screen.getByRole("button", { name: /delete/i }));

        await waitFor(() => {
            expect(screen.getByText("Work in use")).toBeInTheDocument();
        });
        expect(mockToastSuccess).not.toHaveBeenCalled();
    });
});

describe("DeleteTagDialog toast", () => {
    it("toasts on successful delete", async () => {
        const user = userEvent.setup();
        render(
            <DeleteTagDialog
                open={true}
                onOpenChange={() => {}}
                tag={{ id: "t1", name: "Fiction" }}
                onDeleted={jest.fn()}
            />
        );

        await user.click(screen.getByRole("button", { name: /delete/i }));

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith('Tag "Fiction" deleted');
        });
    });
});
