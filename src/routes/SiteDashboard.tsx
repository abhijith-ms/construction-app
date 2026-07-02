import { useParams, useNavigate } from "react-router-dom";
import { useSiteDashboard } from "@/hooks/useSiteDashboard";
import { useActiveSiteAssignments } from "@/hooks/useActiveSiteAssignments";
import { useWagePermissions } from "@/hooks/useWagePermissions";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Users, Package, Receipt, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { format } from "date-fns";

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string | null }) {
  const statusStyles: Record<string, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    on_hold: "bg-amber-100 text-amber-700 border-amber-200",
    completed: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <Badge
      variant="outline"
      className={`capitalize ${statusStyles[status || "active"] || "bg-slate-100 text-slate-700 border-slate-200"}`}
    >
      {(status || "active").replace("_", " ")}
    </Badge>
  );
}

function BudgetProgressBar({ spent, budget }: { spent: number; budget: number | null }) {
  if (!budget || budget <= 0) {
    return (
      <div className="mt-4">
        <div className="h-2 bg-slate-200 rounded-full" />
        <p className="text-xs text-slate-500 mt-1">No budget set</p>
      </div>
    );
  }

  const percentage = Math.min((spent / budget) * 100, 100);
  const isOverBudget = spent > budget;

  // Color rules per spec
  let barColor = "bg-green-500";
  if (isOverBudget || percentage > 90) {
    barColor = "bg-red-500";
  } else if (percentage >= 75) {
    barColor = "bg-amber-500";
  }

  return (
    <div className="mt-4">
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-slate-600">
          {isOverBudget ? (
            <span className="text-red-600 font-medium">Over Budget</span>
          ) : (
            <span>{percentage.toFixed(1)}% used</span>
          )}
        </span>
        <span className="text-xs text-slate-400">
          {formatCurrency(spent)} / {formatCurrency(budget)}
        </span>
      </div>
    </div>
  );
}

export function SiteDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { data, isLoading, error } = useSiteDashboard(id);

  // Redirect if not admin or office manager
  useEffect(() => {
    if (profile && profile.role !== "admin" && profile.role !== "office_manager") {
      toast.error("Access denied. This page is only available to Admin and Office Manager.");
      navigate("/sites");
    }
  }, [profile, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data || !data.site) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/sites")} className="pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sites
        </Button>
        <div className="text-center py-12">
          <p className="text-destructive">Error loading site dashboard</p>
          <p className="text-sm text-slate-500 mt-1">
            {error?.message || "Site not found"}
          </p>
        </div>
      </div>
    );
  }

  const { site, labourCost, siteExpenses, supplierBills, materialUsageCost, totalReceived, workforce: _workforce, stockSummary, recentExpenses, recentStockTransactions } = data;

  const totalSpent = labourCost + siteExpenses + supplierBills + materialUsageCost;
  const remaining = (site.budget || 0) - totalSpent;
  const netPnL = totalReceived - totalSpent;

// Component for Currently Assigned Labour Card
function CurrentlyAssignedLabourCard({ siteId }: { siteId: string | undefined }) {
  const { data: assignments, isLoading } = useActiveSiteAssignments(siteId || null);
  const { canViewWages, isLoading: isLoadingPermissions } = useWagePermissions();

  if (isLoading || isLoadingPermissions) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-slate-500" />
            Currently Assigned Labour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const assignmentCount = assignments?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-slate-500" />
          Currently Assigned Labour
        </CardTitle>
        <CardDescription>
          {assignmentCount} {assignmentCount === 1 ? "labourer" : "labourers"} currently assigned
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignmentCount === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No labourers currently assigned</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {assignments?.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {assignment.labour_name || "Unknown Labourer"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs capitalize">
                      {assignment.task_category}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  {canViewWages && (
                    <p className="font-mono font-medium text-slate-700">
                      {formatCurrency(assignment.daily_rate)}
                      <span className="text-xs text-slate-400 ml-1">/day</span>
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Since {format(new Date(assignment.start_date), "dd MMM yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/sites")} className="pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sites
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{site.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-slate-600">{site.client_name}</span>
              <StatusBadge status={site.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Started: {formatDate(site.start_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Budget Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-slate-500" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Budget</p>
                <p className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                  {formatCurrency(site.budget)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Spent</p>
                <p className="text-xl sm:text-2xl font-semibold text-red-600 mt-1">
                  {formatCurrency(totalSpent)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Labour: {formatCurrency(labourCost)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Remaining</p>
                <p className={`text-xl sm:text-2xl font-semibold mt-1 ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg hidden sm:block">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Breakdown</p>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  <p>Labour: {formatCurrency(labourCost)}</p>
                  <p>Expenses: {formatCurrency(siteExpenses)}</p>
                  <p>Mat. Usage: {formatCurrency(materialUsageCost)}</p>
                  <p>Bills: {formatCurrency(supplierBills)}</p>
                </div>
              </div>
            </div>
            <BudgetProgressBar spent={totalSpent} budget={site.budget} />
          </CardContent>
        </Card>

        {/* Card 2: Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-slate-500" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm text-green-700 font-medium">Total Received</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-800 mt-1">
                {formatCurrency(totalReceived)}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${netPnL >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
              <p className={`text-sm font-medium ${netPnL >= 0 ? "text-green-700" : "text-red-700"}`}>
                Net P&L
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-2xl sm:text-3xl font-bold ${netPnL >= 0 ? "text-green-800" : "text-red-800"}`}>
                  {formatCurrency(netPnL)}
                </p>
                {netPnL >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Currently Assigned Labour */}
        <CurrentlyAssignedLabourCard siteId={id} />

        {/* Card 4: Stock Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-slate-500" />
              Stock Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stockSummary.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No stock recorded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stockSummary.map((item) => (
                  <div
                    key={item.material_id}
                    className="flex items-center justify-between p-2 hover:bg-slate-50 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.unit}</p>
                    </div>
                    <span className="font-mono font-semibold text-slate-700">
                      {item.quantity_on_hand.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 5: Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-slate-500" />
              Recent Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Recent Site Expenses */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Recent Expenses
                </h4>
                {recentExpenses.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">No recent expenses</p>
                ) : (
                  <div className="space-y-2">
                    {recentExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {expense.category}
                          </p>
                          <p className="text-xs text-slate-500">{formatDate(expense.date)}</p>
                        </div>
                        <span className="font-mono font-medium text-red-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Stock Transactions */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Recent Stock Activity
                </h4>
                {recentStockTransactions.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">No recent activity</p>
                ) : (
                  <div className="space-y-2">
                    {recentStockTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {tx.material?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {tx.transaction_type.replace("_", " ")} •{" "}
                            {new Date(tx.created_at).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <span className="font-mono font-medium text-slate-700">
                          {tx.quantity} {tx.material?.unit || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
