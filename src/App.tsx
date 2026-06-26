import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "@/routes/Login";
import { ProtectedLayout } from "@/routes/ProtectedLayout";
import { Dashboard } from "@/routes/Dashboard";
import { Sites } from "@/routes/Sites";
import { Labour } from "@/routes/Labour";
import { Attendance } from "@/routes/Attendance";
import { Staff } from "@/routes/Staff";
import { StaffAttendance } from "@/routes/StaffAttendance";
import { Expenses } from "@/routes/Expenses";
import Payroll from "@/routes/Payroll";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/labour" element={<Labour />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/staff-attendance" element={<StaffAttendance />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/payroll" element={<Payroll />} />
          {/* Default redirect for authenticated routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
