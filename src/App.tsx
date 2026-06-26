import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "@/routes/Login";
import { ProtectedLayout } from "@/routes/ProtectedLayout";
import { Dashboard } from "@/routes/Dashboard";
import { Sites } from "@/routes/Sites";

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