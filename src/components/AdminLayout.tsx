import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
interface AdminLayoutProps {
  children: ReactNode;
}
export function AdminLayout({
  children
}: AdminLayoutProps) {
  const {
    signOut,
    user
  } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-2 sm:px-4 gap-2 sm:gap-3">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Admin Panel</h1>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">{user?.email}</p>
            </div>
            <div className="flex gap-2">
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>;
}