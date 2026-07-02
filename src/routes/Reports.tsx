import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, addDays, getYear, getMonth } from "date-fns";
import { BarChart3, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { usePnlReport, type PnLReportRow } from "@/hooks/usePnlReport";
import { useSites } from "@/hooks/useSites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

type PeriodMode = "weekly" | "monthly" | "yearly";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);
}

function getWeekRange(date: Date): { from: string; to: string } {
  const dayOfWeek = date.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return { from: monday.toISOString().split("T")[0], to: addDays(monday, 5).toISOString().split("T")[0] };
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const date = new Date(year, month, 1);
  return { from: startOfMonth(date).toISOString().split("T")[0], to: endOfMonth(date).toISOString().split("T")[0] };
}

function getYearRange(year: number): { from: string; to: string } {
  const date = new Date(year, 0, 1);
  return { from: startOfYear(date).toISOString().split("T")[0], to: endOfYear(date).toISOString().split("T")[0] };
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  return format(start, "dd MMM") + " - " + format(addDays(start, 5), "dd MMM, yyyy");
}

function getMonthName(month: number): string {
  return format(new Date(2000, month, 1), "MMMM");
}

function PnLCard({ data }: { data: PnLReportRow }) {
  const isProfit = data.net_profit >= 0;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="text-base md:text-lg">{data.site_name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        {/* Mobile Layout */}
        <div className="md:hidden space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Income</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(data.total_income)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Cost</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(data.total_cost)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Labour</p>
              <p className="text-sm font-medium text-red-600">{formatCurrency(data.labour_cost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-sm font-medium text-red-600">{formatCurrency(data.site_expense_cost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mat. Usage</p>
              <p className="text-sm font-medium text-red-600">{formatCurrency(data.material_usage_cost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bills</p>
              <p className="text-sm font-medium text-red-600">{formatCurrency(data.supplier_bill_cost)}</p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Net {isProfit ? "Profit" : "Loss"}</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(Math.abs(data.net_profit))}
                  </p>
                  {isProfit ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
                </div>
              </div>
              {!isProfit && (
                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                  Loss
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Income</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(data.total_income)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Labour</p>
            <p className="text-lg font-medium text-red-600">{formatCurrency(data.labour_cost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Site Expenses</p>
            <p className="text-lg font-medium text-red-600">{formatCurrency(data.site_expense_cost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Mat. Usage</p>
            <p className="text-lg font-medium text-red-600">{formatCurrency(data.material_usage_cost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Supplier Bills</p>
            <p className="text-lg font-medium text-red-600">{formatCurrency(data.supplier_bill_cost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Cost</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(data.total_cost)}</p>
          </div>
          <div className="col-span-2 lg:col-span-2 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Net {isProfit ? "Profit" : "Loss"}</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(data.net_profit))}
              </p>
              {isProfit ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
            </div>
            {!isProfit && (
              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                Loss
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ summary }: { summary: { totalIncome: number; totalCost: number; totalNet: number } }) {
  const isProfit = summary.totalNet >= 0;
  return (
    <Card className="overflow-hidden border-2 border-primary">
      <CardHeader className="pb-4 bg-primary/10">
        <CardTitle className="text-lg">All Sites Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Income</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalCost)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Net {isProfit ? "Profit" : "Loss"}</p>
            <div className="flex items-center justify-center gap-2">
              <p className={`text-2xl font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(summary.totalNet))}
              </p>
              {isProfit ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("monthly");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(getMonth(new Date()));
  const [selectedMonthYear, setSelectedMonthYear] = useState(getYear(new Date()));
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));

  const { data: sites, isLoading: sitesLoading } = useSites();

  const reportParams = useMemo(() => {
    const siteId = selectedSiteId === "all" ? null : selectedSiteId;
    switch (periodMode) {
      case "weekly":
        return { siteId, fromDate: getWeekRange(currentWeek).from, toDate: getWeekRange(currentWeek).to };
      case "monthly":
        return { siteId, fromDate: getMonthRange(selectedMonthYear, selectedMonth).from, toDate: getMonthRange(selectedMonthYear, selectedMonth).to };
      case "yearly":
        return { siteId, fromDate: getYearRange(selectedYear).from, toDate: getYearRange(selectedYear).to };
    }
  }, [periodMode, selectedSiteId, currentWeek, selectedMonth, selectedMonthYear, selectedYear]);

  const { data: pnlData, isLoading: pnlLoading } = usePnlReport(reportParams);

  const navigatePrevious = () => {
    switch (periodMode) {
      case "weekly":
        setCurrentWeek((prev) => addDays(prev, -7));
        break;
      case "monthly":
        if (selectedMonth === 0) {
          setSelectedMonth(11);
          setSelectedMonthYear((prev) => prev - 1);
        } else {
          setSelectedMonth((prev) => prev - 1);
        }
        break;
      case "yearly":
        setSelectedYear((prev) => prev - 1);
        break;
    }
  };

  const navigateNext = () => {
    switch (periodMode) {
      case "weekly":
        setCurrentWeek((prev) => addDays(prev, 7));
        break;
      case "monthly":
        if (selectedMonth === 11) {
          setSelectedMonth(0);
          setSelectedMonthYear((prev) => prev + 1);
        } else {
          setSelectedMonth((prev) => prev + 1);
        }
        break;
      case "yearly":
        setSelectedYear((prev) => prev + 1);
        break;
    }
  };

  const getCurrentPeriodLabel = (): string => {
    switch (periodMode) {
      case "weekly":
        return formatWeekLabel(getWeekRange(currentWeek).from);
      case "monthly":
        return getMonthName(selectedMonth) + " " + selectedMonthYear;
      case "yearly":
        return selectedYear.toString();
    }
  };

  const summary = useMemo(() => {
    if (!pnlData || pnlData.length === 0) return null;
    return pnlData.reduce(
      (acc, row) => ({
        totalIncome: acc.totalIncome + row.total_income,
        totalCost: acc.totalCost + row.total_cost,
        totalNet: acc.totalNet + row.net_profit,
      }),
      { totalIncome: 0, totalCost: 0, totalNet: 0 }
    );
  }, [pnlData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <BarChart3 className="h-6 w-6" />
            P&amp;L Reports
          </h1>
          <p className="text-muted-foreground">Profit and Loss by Site</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-shrink-0">
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Tabs value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
                <TabsList>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="text-sm font-medium mr-2">Date Range</label>
              <Button variant="outline" size="icon" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] text-center font-medium px-4 py-2 bg-muted rounded-md">
                {getCurrentPeriodLabel()}
              </div>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Site</label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {pnlLoading || sitesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !pnlData || pnlData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted rounded-lg">
          No data available for the selected period
        </div>
      ) : (
        <div className="space-y-4">
          {pnlData.map((row: PnLReportRow) => (
            <PnLCard key={row.site_id} data={row} />
          ))}
          {selectedSiteId === "all" && summary && pnlData.length > 1 && (
            <SummaryCard summary={summary} />
          )}
        </div>
      )}
    </div>
  );
}
