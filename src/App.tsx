import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "@/routes/Login";
import { ProtectedLayout } from "@/routes/ProtectedLayout";
import { Dashboard } from "@/routes/Dashboard";
import { Sites } from "@/routes/Sites";
import { SiteDashboard } from "@/routes/SiteDashboard";
import SiteDetail from "@/routes/SiteDetail";
import { Labour } from "@/routes/Labour";
import { Attendance } from "@/routes/Attendance";
import { Staff } from "@/routes/Staff";
import { StaffAttendance } from "@/routes/StaffAttendance";
import { Expenses } from "@/routes/Expenses";
import Payroll from "@/routes/Payroll";
import { Users } from "@/routes/Users";
import { WorkCategories } from "@/routes/WorkCategories";
import PayReceipts from "@/routes/PayReceipts";
import Suppliers from "@/routes/Suppliers";
import SupplierDetail from "@/routes/SupplierDetail";
import Stock from "@/routes/Stock";
import Reports from "@/routes/Reports";

function App() {
  // useTransitions={false}: RRD v7 wraps navigation in React.startTransition() by default,
  // making navigation low-priority/interruptible. Under heavy render work (e.g. Attendance page
  // state changes) the navigation transition is repeatedly deferred and never commits, causing
  // "URL changes but content doesn't update." Synchronous navigation restores v5/v6 behaviour.
  return (
    <BrowserRouter useTransitions={false}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/sites/:siteId" element={<SiteDetail />} />
          <Route path="/sites/:id/dashboard" element={<SiteDashboard />} />
          <Route path="/labour" element={<Labour />} />
          {/* Attendance, Expenses, Receipts, Payroll now live inside SiteDetail tabs */}
          {/* Keep legacy routes for direct access if needed */}
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/pay-receipts" element={<PayReceipts />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/staff-attendance" element={<StaffAttendance />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/users" element={<Users />} />
          <Route path="/work-categories" element={<WorkCategories />} />
          {/* Default redirect for authenticated routes - now goes to Sites */}
          <Route path="/" element={<Navigate to="/sites" replace />} />
        </Route>

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
