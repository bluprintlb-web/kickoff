"use client";

import { Lock, TrendingUp, Unlock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/trpc/react";

export type MonthlyStat = { month: string; revenue: number; orderCount: number };

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

// Since when the store started (its first counted sale) through the
// current month, one row per month — revenue always visible, cost/profit
// PIN-gated like Product.costPrice, since profit is directly derived from
// cost. Same "Show/Hide" toggle pattern as AdminProductsTable's cost
// column.
export function MonthlyProfitCard({ months }: { months: MonthlyStat[] }) {
  const [costsUnlocked, setCostsUnlocked] = useState(false);
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [pin, setPin] = useState("");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const revealMonthlyCosts = trpc.order.revealMonthlyCosts.useQuery(
    { pin },
    { enabled: false }
  );

  async function handleUnlock() {
    const result = await revealMonthlyCosts.refetch();
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    const map: Record<string, number> = {};
    for (const row of result.data ?? []) {
      map[row.month] = row.cost;
    }
    setCosts(map);
    setCostsUnlocked(true);
    setPinDialogOpen(false);
    setPin("");
  }

  function handleToggle() {
    if (costsUnlocked) {
      setCostsUnlocked(false);
      setCosts({});
      return;
    }
    setPinDialogOpen(true);
  }

  const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0);
  const totalOrders = months.reduce((sum, m) => sum + m.orderCount, 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <CardTitle>Monthly profit</CardTitle>
              <CardDescription>
                {totalOrders} order{totalOrders === 1 ? "" : "s"} · $
                {totalRevenue.toFixed(2)} total revenue since{" "}
                {months[0] ? monthLabel(months[0].month) : "—"}
              </CardDescription>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleToggle}>
            {costsUnlocked ? (
              <Unlock className="size-3.5" />
            ) : (
              <Lock className="size-3.5" />
            )}
            {costsUnlocked ? "Hide profit" : "Show profit"}
          </Button>
        </CardHeader>
        <CardContent>
          {months.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed sales yet — this fills in once the first order is
              paid.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Revenue</TableHead>
                  {costsUnlocked && <TableHead>Cost</TableHead>}
                  {costsUnlocked && <TableHead>Profit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...months].reverse().map((m) => {
                  const cost = costs[m.month];
                  const profit = cost != null ? m.revenue - cost : null;
                  return (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">
                        {monthLabel(m.month)}
                      </TableCell>
                      <TableCell>{m.orderCount}</TableCell>
                      <TableCell>${m.revenue.toFixed(2)}</TableCell>
                      {costsUnlocked && (
                        <TableCell className="text-muted-foreground">
                          {cost != null ? `$${cost.toFixed(2)}` : "—"}
                        </TableCell>
                      )}
                      {costsUnlocked && (
                        <TableCell
                          className={
                            profit != null && profit < 0
                              ? "font-medium text-destructive"
                              : "font-medium text-brand"
                          }
                        >
                          {profit != null ? `$${profit.toFixed(2)}` : "—"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlock();
            }}
            className="flex flex-col gap-3"
          >
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <Button type="submit" disabled={revealMonthlyCosts.isFetching}>
              {revealMonthlyCosts.isFetching ? "Checking..." : "Unlock"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
