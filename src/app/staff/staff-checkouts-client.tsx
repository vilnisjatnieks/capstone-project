"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [workListOpen, setWorkListOpen] = useState(false);
  const [userListOpen, setUserListOpen] = useState(false);
  const [workSearch, setWorkSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [formData, setFormData] = useState({
    work_id: "",
    user_id: "",
    due_date: "",
  });

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

  function defaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  }

  function openCheckoutDialog() {
    setFormData({ work_id: "", user_id: "", due_date: defaultDueDate() });
    setFormError("");
    setWorkListOpen(false);
    setUserListOpen(false);
    setWorkSearch("");
    setUserSearch("");
    setFormOpen(true);
  }

  function openReturnDialog(checkout: Checkout) {
    setReturningCheckout(checkout);
    setReturnOpen(true);
  }

  function isOverdue(checkout: Checkout) {
    return !checkout.returned_at && new Date(checkout.due_date) < new Date();
  }

  async function handleCheckout(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/staff/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to create checkout");
        return;
      }

      setFormOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn() {
    if (!returningCheckout) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/staff/checkouts/${returningCheckout.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "return" }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to return item");
        return;
      }

      setReturnOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={openCheckoutDialog}>Check Out Item</Button>
        <Input
          id="checkout-search"
          placeholder="Search by title, name, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
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

      {/* Check Out Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className="max-w-lg"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Check Out Item</DialogTitle>
            <DialogDescription>
              Select a work and a user to create a checkout.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Work</span>
              <Command className="rounded-md border" shouldFilter={workListOpen}>
                <CommandInput
                  name="work-search"
                  placeholder="Search works..."
                  hideIcon={!workListOpen && !!formData.work_id}
                  value={workListOpen ? workSearch : (availableWorks.find((w) => w.id === formData.work_id)?.title ?? "")}
                  onValueChange={(v) => setWorkSearch(v)}
                  onFocus={() => {
                    setWorkSearch("");
                    setWorkListOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setWorkListOpen(false), 150)}
                />
                {workListOpen && (
                  <CommandList>
                    <CommandEmpty>No works found.</CommandEmpty>
                    <CommandGroup>
                      {availableWorks.map((work) => (
                        <CommandItem
                          key={work.id}
                          value={work.title}
                          onSelect={() => {
                            setFormData((prev) => ({
                              ...prev,
                              work_id: work.id,
                            }));
                            setWorkSearch("");
                            setWorkListOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.work_id === work.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {work.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                )}
              </Command>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Borrower</span>
              <Command className="rounded-md border" shouldFilter={userListOpen}>
                <CommandInput
                  name="borrower-search"
                  placeholder="Search by name or email..."
                  hideIcon={!userListOpen && !!formData.user_id}
                  value={userListOpen ? userSearch : (() => {
                    const u = users.find((u) => u.id === formData.user_id);
                    return u ? `${u.name} (${u.email})` : "";
                  })()}
                  onValueChange={(v) => setUserSearch(v)}
                  onFocus={() => {
                    setUserSearch("");
                    setUserListOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setUserListOpen(false), 150)}
                />
                {userListOpen && (
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.name} ${user.email}`}
                          onSelect={() => {
                            setFormData((prev) => ({
                              ...prev,
                              user_id: user.id,
                            }));
                            setUserSearch("");
                            setUserListOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.user_id === user.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {user.name} ({user.email})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                )}
              </Command>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">
                Due Date{" "}
                <span className="text-muted-foreground font-normal">(30 days by default)</span>
              </Label>
              <Input
                id="due_date"
                type="date"
                required
                value={formData.due_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    due_date: e.target.value,
                  }))
                }
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.work_id || !formData.user_id}
              >
                {submitting ? "Checking out..." : "Check Out"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Confirmation Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Item</DialogTitle>
            <DialogDescription>
              Return &quot;{returningCheckout?.work_title}&quot; from{" "}
              {returningCheckout?.user_name}?
            </DialogDescription>
          </DialogHeader>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReturn} disabled={submitting}>
              {submitting ? "Returning..." : "Confirm Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
