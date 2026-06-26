import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useSettlements, type Settlement } from '@/hooks/useSettlements';
import { useLabour } from '@/hooks/useLabour';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SettlementRow extends Settlement {
  labour?: {
    id: string;
    full_name: string;
    default_work_category: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = addDays(start, 5);
  return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM, yyyy')}`;
}

function getWeekRange(date: Date) {
  const dayOfWeek = date.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: saturday.toISOString().split('T')[0],
  };
}

export default function Payroll() {
  const { user } = useAuthStore();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const { weekStart } = getWeekRange(currentWeek);
  const { data: settlements, isLoading, refetch } = useSettlements(currentWeek);
  const { data: labourList } = useLabour();

  function previousWeek() {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  }

  function nextWeek() {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  }

  async function calculateSettlement(labourId: string) {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('calculate_weekly_settlement', {
        p_labour_id: labourId,
        p_week_start: weekStart,
        p_last_edited_by: user.id,
      });

      if (error) throw error;
      toast.success('Settlement calculated successfully');
      refetch();
    } catch (err) {
      console.error('Error calculating settlement:', err);
      toast.error('Failed to calculate settlement');
    }
  }

  // Partial payment UI deferred — see KNOWN_GAPS.md
  // The DB function mark_settlement_paid supports partial payments,
  // but the UI only exposes full payment for now.
  async function markSettlementsPaid(settlementId: string) {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('mark_settlement_paid', {
        p_settlement_id: settlementId,
        p_amount_paid: 0, // 0 means pay full net_payable
        p_marked_by: user.id,
      });

      if (error) throw error;
      toast.success('Payment recorded successfully');
      refetch();
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error('Failed to record payment');
    }
  }

  const settlementsWithLabour = (settlements || []) as SettlementRow[];

  // Get labour without settlements for this week
  const labourWithSettlements = new Set(
    settlementsWithLabour.map((s) => s.labour_id)
  );
  const labourWithoutSettlements =
    labourList?.filter((l) => !labourWithSettlements.has(l.id)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payroll</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={previousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[150px] text-center">
            {formatDateRange(weekStart)}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Week Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Gross</p>
              <p className="text-lg font-semibold">
                {formatCurrency(
                  settlementsWithLabour.reduce((sum, s) => sum + (s.gross_wages || 0), 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Advances</p>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(
                  settlementsWithLabour.reduce((sum, s) => sum + (s.total_advances || 0), 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Carried Over</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(
                  settlementsWithLabour.reduce((sum, s) => sum + (s.carried_over_due || 0), 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Payable</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(
                  settlementsWithLabour.reduce((sum, s) => sum + (s.net_payable || 0), 0)
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : settlementsWithLabour.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">Worker</th>
                    <th className="text-left py-3 font-medium">Category</th>
                    <th className="text-right py-3 font-medium">Gross</th>
                    <th className="text-right py-3 font-medium">Advances</th>
                    <th className="text-right py-3 font-medium">Carried</th>
                    <th className="text-right py-3 font-medium">Net</th>
                    <th className="text-left py-3 font-medium">Status</th>
                    <th className="text-left py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementsWithLabour.map((settlement) => (
                    <tr key={settlement.id} className="border-b last:border-b-0">
                      <td className="py-3 font-medium">
                        {settlement.labour?.full_name || 'Unknown'}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {settlement.labour?.default_work_category || 'N/A'}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(settlement.gross_wages)}
                      </td>
                      <td className="py-3 text-right text-orange-600">
                        {settlement.total_advances > 0
                          ? `-${formatCurrency(settlement.total_advances)}`
                          : '-'}
                      </td>
                      <td className="py-3 text-right text-red-600">
                        {settlement.carried_over_due > 0
                          ? formatCurrency(settlement.carried_over_due)
                          : '-'}
                      </td>
                      <td className="py-3 text-right font-semibold">
                        {formatCurrency(settlement.net_payable)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            settlement.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : settlement.payment_status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {settlement.payment_status}
                        </span>
                        {settlement.net_payable > (settlement.amount_paid || 0) &&
                          settlement.payment_status !== 'pending' && (
                            <span className="ml-2 text-xs text-orange-600">
                              Due: {formatCurrency(settlement.net_payable - (settlement.amount_paid || 0))}
                            </span>
                          )}
                      </td>
                      <td className="py-3">
                        {settlement.payment_status !== 'paid' ? (
                          <Button
                            size="sm"
                            onClick={() => markSettlementsPaid(settlement.id)}
                          >
                            Mark as Paid
                          </Button>
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No settlements calculated for this week
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labour without settlements */}
      {labourWithoutSettlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Calculate New Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              The following workers have attendance records but no settlement calculated for this
              week.
            </div>
            <div className="flex flex-wrap gap-2">
              {labourWithoutSettlements.map((labour) => (
                <Button
                  key={labour.id}
                  variant="outline"
                  onClick={() => calculateSettlement(labour.id)}
                >
                  {labour.full_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
