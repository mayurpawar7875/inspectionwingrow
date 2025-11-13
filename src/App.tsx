import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./lib/auth";
import { AdminLayout } from "./components/AdminLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import MarketSelection from "./pages/MarketSelection";
import Punch from "./pages/Punch";
import Stalls from "./pages/Stalls";
import MediaUpload from "./pages/MediaUpload";
import Finalize from "./pages/Finalize";
import Install from "./pages/Install";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AllSessions from "./pages/admin/AllSessions";
import Users from "./pages/admin/Users";
import LiveMarket from "./pages/admin/LiveMarket";
import MarketDetail from "./pages/admin/MarketDetail";
import Settings from "./pages/admin/Settings";
import LeaveRequests from "./pages/admin/LeaveRequests";
import NotFound from "./pages/NotFound";
import Collections from "./pages/admin/Collections";
import MySessions from "./pages/MySessions";
import MarketManagerDashboard from "./pages/MarketManagerDashboard";
import MyManagerSessions from "./pages/MyManagerSessions";
import BDODashboard from "./pages/BDODashboard";
import BDOSession from "./pages/BDOSession";
import BDOReporting from "./pages/admin/BDOReporting";
import EmployeeReporting from "./pages/admin/EmployeeReporting";
import EmployeeCitySelection from "./pages/admin/EmployeeCitySelection";
import EmployeeMarketsList from "./pages/admin/EmployeeMarketsList";
import MarketManagerReporting from "./pages/admin/MarketManagerReporting";
import AttendanceReporting from "./pages/admin/AttendanceReporting";
import MyAttendance from "./pages/MyAttendance";
import AssetRequests from "./pages/AssetRequests";
import { AssetManagement } from "./components/admin/AssetManagement";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <React.Fragment>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/manager-dashboard" element={<ProtectedRoute><MarketManagerDashboard /></ProtectedRoute>} />
              <Route path="/my-manager-sessions" element={<ProtectedRoute><MyManagerSessions /></ProtectedRoute>} />
              <Route path="/bdo-dashboard" element={<ProtectedRoute><BDODashboard /></ProtectedRoute>} />
              <Route path="/bdo-session" element={<ProtectedRoute><BDOSession /></ProtectedRoute>} />
              <Route path="/market-selection" element={<ProtectedRoute><MarketSelection /></ProtectedRoute>} />
              <Route path="/punch" element={<ProtectedRoute><Punch /></ProtectedRoute>} />
              <Route path="/stalls" element={<ProtectedRoute><Stalls /></ProtectedRoute>} />
              <Route path="/media-upload" element={<ProtectedRoute><MediaUpload /></ProtectedRoute>} />
              <Route path="/finalize" element={<ProtectedRoute><Finalize /></ProtectedRoute>} />
              <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
              <Route path="/my-sessions" element={<ProtectedRoute><MySessions /></ProtectedRoute>} />
              <Route path="/asset-requests" element={<ProtectedRoute><AssetRequests /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/asset-management" element={<ProtectedRoute><AdminLayout><AssetManagement /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/bdo-reporting" element={<ProtectedRoute><AdminLayout><BDOReporting /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/employee-reporting" element={<ProtectedRoute><AdminLayout><EmployeeCitySelection /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/employee-reporting/city/:city" element={<ProtectedRoute><AdminLayout><EmployeeMarketsList /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/employee-reporting/market/:marketId" element={<ProtectedRoute><AdminLayout><EmployeeReporting /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/market-reporting" element={<ProtectedRoute><AdminLayout><MarketManagerReporting /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/attendance" element={<ProtectedRoute><AdminLayout><AttendanceReporting /></AdminLayout></ProtectedRoute>} />
              <Route path="/my-attendance" element={<ProtectedRoute><MyAttendance /></ProtectedRoute>} />
              <Route path="/admin/live-market" element={<ProtectedRoute><AdminLayout><LiveMarket /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/sessions" element={<ProtectedRoute><AdminLayout><AllSessions /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminLayout><Users /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/leaves" element={<ProtectedRoute><AdminLayout><LeaveRequests /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/collections" element={<ProtectedRoute><AdminLayout><Collections /></AdminLayout></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin/market/:marketId" element={<ProtectedRoute><MarketDetail /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </React.Fragment>
);

export default App;
