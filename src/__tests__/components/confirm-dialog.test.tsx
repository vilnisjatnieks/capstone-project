import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "@/components/confirm-dialog";

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
    const defaults = {
        open: true,
        onOpenChange: jest.fn(),
        title: "Delete item?",
        description: "This cannot be undone.",
        onConfirm: jest.fn().mockResolvedValue(undefined),
    };
    return render(<ConfirmDialog {...defaults} {...props} />);
}

describe("ConfirmDialog", () => {
    it("renders title and description", () => {
        renderDialog();
        expect(screen.getByText("Delete item?")).toBeInTheDocument();
        expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    });

    it("renders default confirm and cancel labels", () => {
        renderDialog();
        expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("renders custom confirm and cancel labels", () => {
        renderDialog({ confirmLabel: "Delete", cancelLabel: "Keep" });
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
    });

    it("calls onConfirm when confirm button is clicked", async () => {
        const user = userEvent.setup();
        const onConfirm = jest.fn().mockResolvedValue(undefined);
        renderDialog({ onConfirm });

        await user.click(screen.getByRole("button", { name: "Confirm" }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenChange(false) on success", async () => {
        const user = userEvent.setup();
        const onOpenChange = jest.fn();
        const onConfirm = jest.fn().mockResolvedValue(undefined);
        renderDialog({ onOpenChange, onConfirm });

        await user.click(screen.getByRole("button", { name: "Confirm" }));

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("does not call onConfirm when cancel is clicked", async () => {
        const user = userEvent.setup();
        const onConfirm = jest.fn();
        renderDialog({ onConfirm });

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("calls onOpenChange(false) when cancel is clicked", async () => {
        const user = userEvent.setup();
        const onOpenChange = jest.fn();
        renderDialog({ onOpenChange });

        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("shows error text when onConfirm throws", async () => {
        const user = userEvent.setup();
        const onConfirm = jest.fn().mockRejectedValue(new Error("Server error"));
        renderDialog({ onConfirm });

        await user.click(screen.getByRole("button", { name: "Confirm" }));

        await waitFor(() => {
            expect(screen.getByText("Server error")).toBeInTheDocument();
        });
    });

    it("does not close when onConfirm throws", async () => {
        const user = userEvent.setup();
        const onOpenChange = jest.fn();
        const onConfirm = jest.fn().mockRejectedValue(new Error("Server error"));
        renderDialog({ onOpenChange, onConfirm });

        await user.click(screen.getByRole("button", { name: "Confirm" }));

        await waitFor(() => {
            expect(screen.getByText("Server error")).toBeInTheDocument();
        });
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it("disables the confirm button while submitting", async () => {
        const user = userEvent.setup();
        let resolve: () => void;
        const onConfirm = jest.fn(
            () => new Promise<void>((res) => { resolve = res; })
        );
        renderDialog({ onConfirm });

        await user.click(screen.getByRole("button", { name: "Confirm" }));

        expect(screen.getByRole("button", { name: /confirm\.\.\./i })).toBeDisabled();
        resolve!();
    });

    it("does not render when open is false", () => {
        renderDialog({ open: false });
        expect(screen.queryByText("Delete item?")).not.toBeInTheDocument();
    });
});
