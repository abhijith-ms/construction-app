import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, Wallet, CreditCard, Banknote, Landmark } from 'lucide-react';
import { useSettlements, type Settlement } from '@/hooks/useSettlements';
import { useLabour } from '@/hooks/useLabour';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
  { value: 'cheque', label: 'Cheque', icon: Wallet },
] as const;

type PaymentMode = typeof PAYMENT_MODES[number]['value'];

interface PaymentModeBadgeProps {
  mode: string | null;
  reference: string | null;
}

function PaymentModeBadge({ mode, reference }: PaymentModeBadgeProps) {
  if (!mode) return null;
  
  const modeConfig = PAYMENT_MODES.find(m => m.value === mode) || PAYMENT_MODES[0];
  const Icon = modeConfig.icon;
  
  let referenceLabel = '';
  if (reference) {
    if (mode === 'upi') referenceLabel = ` (${reference})`;
    else if (mode === 'cheque') referenceLabel = ` (${reference})`;
    else if (mode === 'bank_transfer') referenceLabel = ` (${reference})`;
  }
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
      <Icon className="h-3 w-3" />
      {modeConfig.label}{referenceLabel}
    </span>
  );
}

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
  const day = date.getDay(); // 0=Sunday, 1=Monday...
  const diff = day === 0 ? -6 : 1 - day; // if Sunday, go back 6 days; otherwise go to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return {
    weekStart: format(monday, 'yyyy-MM-dd'),
    weekEnd: format(saturday, 'yyyy-MM-dd'),
  };
}

export default function Payroll() {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Payment dialog/sheet state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRow | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paymentReference, setPaymentReference] = useState('');

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

  function openPaymentDialog(settlement: SettlementRow) {
    setSelectedSettlement(settlement);
    setPaymentMode('cash');
    setPaymentReference('');
    setPaymentDialogOpen(true);
  }

  function closePaymentDialog() {
    setPaymentDialogOpen(false);
    setSelectedSettlement(null);
    setPaymentMode('cash');
    setPaymentReference('');
  }

  async function handleMarkPaid() {
    if (!user || !selectedSettlement) return;

    // Validate payment reference for non-cash modes
    if (paymentMode !== 'cash' && !paymentReference.trim()) {
      const modeLabels: Record<PaymentMode, string> = {
        cash: 'Cash',
        upi: 'UPI Transaction ID',
        bank_transfer: 'Bank Reference',
        cheque: 'Cheque Number',
      };
      toast.error(`${modeLabels[paymentMode]} is required`);
      return;
    }

    try {
      const { error } = await supabase.rpc('mark_settlement_paid', {
        p_settlement_id: selectedSettlement.id,
        p_amount_paid: 0, // 0 means pay full net_payable
        p_marked_by: user.id,
        p_payment_mode: paymentMode,
        p_payment_reference: paymentMode === 'cash' ? null : paymentReference.trim() || null,
      });

      if (error) throw error;
      toast.success('Payment recorded successfully');
      closePaymentDialog();
      refetch();
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error('Failed to record payment');
    }
  }

  // Reference label based on payment mode
  const getReferenceLabel = (mode: PaymentMode): string => {
    switch (mode) {
      case 'upi':
        return 'UPI Transaction ID';
      case 'bank_transfer':
        return 'Bank Reference';
      case 'cheque':
        return 'Cheque Number';
      default:
        return 'Reference';
    }
  };

  // Check if reference field is visible and required
  const showReferenceField = paymentMode !== 'cash';

  const PaymentDialogContent = (
    <>
      <div className="space-y-4 py-2">
        {selectedSettlement && (
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Paying</p>
            <p className="font-semibold">{selectedSettlement.labour?.full_name}</p>
            <p className="text-lg font-bold text-green-600 mt-1">
              {formatCurrency(selectedSettlement.net_payable)}
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="payment-mode">Payment Mode</Label>
          <Select
            value={paymentMode}
            onValueChange={(value) => setPaymentMode(value as PaymentMode)}
          >
            <SelectTrigger id="payment-mode">
              <SelectValue placeholder="Select payment mode" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div className="flex items-center gap-2">
                    <mode.icon className="h-4 w-4" />
                    {mode.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showReferenceField && (
          <div className="space-y-2">
            <Label htmlFor="payment-reference">{getReferenceLabel(paymentMode)} *</Label>
            <Input
              id="payment-reference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder={`Enter ${getReferenceLabel(paymentMode).toLowerCase()}`}
            />
            <p className="text-xs text-muted-foreground">Required for {paymentMode} payment</p>
          </div>
        )}
      </div>
    </>
  );

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

      {/* Settlements Table - Desktop */}
      <Card className="hidden md:block">
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
                        <div className="space-y-1">
                          {settlement.payment_status !== 'paid' ? (
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(settlement)}
                            >
                              Mark as Paid
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <PaymentModeBadge 
                                mode={settlement.payment_mode} 
                                reference={settlement.payment_reference} 
                              />
                            </div>
                          )}
                        </div>
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

      {/* Settlements Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : settlementsWithLabour.length > 0 ? (
          settlementsWithLabour.map((settlement) => (
            <Card key={settlement.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{settlement.labour?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {settlement.labour?.default_work_category || 'N/A'}
                    </p>
                  </div>
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
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Gross</p>
                    <p className="font-medium">{formatCurrency(settlement.gross_wages)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Advances</p>
                    <p className="font-medium text-orange-600">
                      {settlement.total_advances > 0
                        ? `-${formatCurrency(settlement.total_advances)}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carried Over</p>
                    <p className="font-medium text-red-600">
                      {settlement.carried_over_due > 0
                        ? formatCurrency(settlement.carried_over_due)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Payable</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(settlement.net_payable)}
                    </p>
                  </div>
                </div>
                {settlement.net_payable > (settlement.amount_paid || 0) &&
                  settlement.payment_status !== 'pending' && (
                    <p className="text-xs text-orange-600">
                      Due: {formatCurrency(settlement.net_payable - (settlement.amount_paid || 0))}
                    </p>
                  )}
                <div className="pt-2">
                  {settlement.payment_status !== 'paid' ? (
                    <Button
                      className="w-full"
                      onClick={() => openPaymentDialog(settlement)}
                    >
                      Mark as Paid
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Paid</span>
                      </div>
                      <PaymentModeBadge 
                        mode={settlement.payment_mode} 
                        reference={settlement.payment_reference} 
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No settlements calculated for this week
          </div>
        )}
      </div>

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
                  className="md:w-auto w-full"
                >
                  {labour.full_name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog (Desktop) */}
      {!isMobile && (
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            {PaymentDialogContent}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closePaymentDialog}>
                Cancel
              </Button>
              <Button onClick={handleMarkPaid}>
                Confirm Pay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Sheet (Mobile) */}
      {isMobile && (
        <Sheet open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>Record Payment</SheetTitle>
            </SheetHeader>
            {PaymentDialogContent}
            <SheetFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={closePaymentDialog} className="w-full">
                Cancel
              </Button>
              <Button onClick={handleMarkPaid} className="w-full">
                Confirm Pay
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
