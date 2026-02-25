"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { CheckoutFormDialog } from "./checkout-form-dialog";
import { ReturnCheckoutDialog } from "./return-checkout-dialog";

interface Checkout {
  id: string;
  work_id: string;
  user_id: string;
  checked_out_at: string;
  due_date: string;
  returned_at: string | null;
  work_title: string;
  user_name: string;
  user_email: string;
}

interface Work {
  id: string;
  title: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface StaffCheckoutsClientProps {
  initialCheckouts: Checkout[];
  works: Work[];
  users: User[];
}

export function StaffCheckoutsClient({
  initialCheckouts,
  works,
  users,
}: StaffCheckoutsClientProps) {
  const router = useRouter();
  const checkouts = initialCheckouts;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [formOpen, setFormOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returningCheckout, setReturningCheckout] = useState<Checkout | null>(
    null,
  );

  const checkedOutWorkIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of checkouts) {
      if (!c.returned_at) ids.add(c.work_id);
    }
    return ids;
  }, [checkouts]);

  const availableWorks = useMemo(
    () => works.filter((w) => !checkedOutWorkIds.has(w.id)),
    [works, checkedOutWorkIds],
  );

  const filteredCheckouts = useMemo(() => {
    return checkouts.filter((c) => {
      const matchesSearch =
        !search ||
        c.work_title.toLowerCase().includes(search.toLowerCase()) ||
        c.user_name.toLowerCase().includes(search.toLowerCase()) ||
        c.user_email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !c.returned_at) ||
        (statusFilter === "returned" && c.returned_at);
      return matchesSearch && matchesStatus;
    });
  }, [checkouts, search, statusFilter]);

  function openReturnDialog(checkout: Checkout) {
    setReturningCheckout(checkout);
    setReturnOpen(true);
  }

  function isOverdue(checkout: Checkout) {
    return !checkout.returned_at && new Date(checkout.due_date) < new Date();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={() => setFormOpen(true)}>Check Out Item</Button>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="checkout-search"
            placeholder="Search by title, name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select name="status-filter" value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="status-filter" className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Work</TableHead>
            <TableHead>Borrower</TableHead>
            <TableHead>Checked Out</TableHead>
            <TableHead>Due Date</TableHead>
            {statusFilter === "returned" ? (
              <TableHead>Returned</TableHead>
            ) : statusFilter === "all" ? (
              <>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </>
            ) : (
              <TableHead className="w-[100px]">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCheckouts.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={statusFilter === "all" ? 6 : 5}
                className="text-center text-muted-foreground"
              >
                No checkouts found.
              </TableCell>
            </TableRow>
          ) : (
            filteredCheckouts.map((checkout) => (
              <TableRow key={checkout.id}>
                <TableCell className="font-medium">
                  {checkout.work_title}
                </TableCell>
                <TableCell>
                  {checkout.user_name}
                  <span className="block text-xs text-muted-foreground">
                    {checkout.user_email}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(checkout.checked_out_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(checkout.due_date).toLocaleDateString()}
                </TableCell>
                {statusFilter === "returned" ? (
                  <TableCell>
                    {checkout.returned_at
                      ? new Date(checkout.returned_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                ) : statusFilter === "all" ? (
                  <>
                    <TableCell>
                      {checkout.returned_at ? (
                        <Badge variant="secondary">Returned</Badge>
                      ) : isOverdue(checkout) ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : (
                        <Badge>Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!checkout.returned_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReturnDialog(checkout)}
                        >
                          Return
                        </Button>
                      )}
                    </TableCell>
                  </>
                ) : (
                  <TableCell>
                    {!checkout.returned_at && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReturnDialog(checkout)}
                      >
                        Return
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <CheckoutFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        availableWorks={availableWorks}
        users={users}
        onCreated={() => router.refresh()}
      />

      <ReturnCheckoutDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        checkout={returningCheckout}
        onReturned={() => router.refresh()}
      />
    </div>
  );
}
