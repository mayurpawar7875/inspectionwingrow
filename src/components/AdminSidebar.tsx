import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, FileText, Settings } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "All Sessions", url: "/admin/sessions", icon: FileText },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  // Force readable text for inactive links; keep theme colors for active
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex w-full items-center gap-2 rounded-md px-2 py-2 transition",
      isActive
        ? "bg-accent text-accent-foreground font-medium"
        : // ↓ Inactive state: force dark text so it isn't white on white
          "!text-neutral-900 dark:!text-neutral-100 hover:bg-accent/50",
    ].join(" ");

  return (
    <Sidebar className="w-64">
      <SidebarContent>
        <SidebarGroup>
          {/* Make the section label readable too */}
          <SidebarGroupLabel className="!text-neutral-900 dark:!text-neutral-100">Admin Panel</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="flex items-center gap-2">
                    <NavLink to={item.url} end className={linkClass}>
                      {/* Icons also inherit forced color when inactive */}
                      <item.icon className="h-4 w-4 flex-shrink-0 !text-neutral-900 dark:!text-neutral-100" />
                      <span className="ml-1 !text-neutral-900 dark:!text-neutral-100">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
