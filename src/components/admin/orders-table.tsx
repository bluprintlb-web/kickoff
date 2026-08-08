"use client";

import { Search, Store, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Money } from "@/lib/pricing";
import { trpc } from "@/trpc/react";

export type AdminOrder = {
  id: string;
  createdAt: string | Date;
  channel: "ONLINE" | "IN_STORE";
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  total: Money;
  paymentMethod: "WHISH" | "CARD" | "CASH" | null;
  customerName: string | null;
  customerEmail: string | null;
  itemCount: number;
};

const STATUS_OPTIONS = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

const STATUS_BADGE: Record<AdminOrder["status"], React.ComponentProps<typeof Badge>["variant"]> = {
  PENDING: "secondary",
  PAID: "outline",
  SHIPPED: "solid-warning",
  DELIVERED: "solid-success",
  CANCELLED: "solid-destructive",
};

export function AdminOrdersTable({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");

  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => router.refresh(),
    onError: (error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = orders;
    if (q) {
      rows = rows.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerEmail?.toLowerCase().includes(q)
      );
    }
    if (status !== "ALL") {
      rows = rows.filter((o) => o.status === status);
    }
    return rows;
  }, [orders, search, status]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or order id…"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => v && setStatus(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Update status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell className="font-medium">
                  {order.customerName ?? order.customerEmail ?? "Walk-in"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="gap-1">
                    {order.channel === "ONLINE" ? (
                      <Truck className="size-3" />
                    ) : (
                      <Store className="size-3" />
                    )}
                    {order.channel === "ONLINE" ? "Online" : "In-store"}
                  </Badge>
                </TableCell>
                <TableCell>{order.itemCount}</TableCell>
                <TableCell>${Number(order.total).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[order.status]}>{order.status}</Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(v) =>
                      v &&
                      v !== order.status &&
                      updateStatus.mutate({
                        id: order.id,
                        status: v as AdminOrder["status"],
                      })
                    }
                  >
                    <SelectTrigger className="w-36" disabled={updateStatus.isPending}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <p className="px-6 py-8 text-center text-muted-foreground">
            No orders match.
          </p>
        )}
      </Card>
    </div>
  );
}
