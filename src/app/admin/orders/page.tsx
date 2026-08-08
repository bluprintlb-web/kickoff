import { AdminOrdersTable } from "@/components/admin/orders-table";
import { MonthlyProfitCard } from "@/components/admin/monthly-profit-card";
import { trpcCaller } from "@/trpc/server";

export default async function AdminOrdersPage() {
  const trpc = await trpcCaller();
  const [orders, months] = await Promise.all([
    trpc.order.adminList(),
    trpc.order.monthlyStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">
          Track order status and monthly profit.
        </p>
      </div>

      <MonthlyProfitCard months={months} />

      <AdminOrdersTable orders={orders} />
    </div>
  );
}
