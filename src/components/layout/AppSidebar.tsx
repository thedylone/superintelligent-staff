import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  Network,
  FileText,
  Settings,
  LogOut,
  Brain,
  ChevronLeft,
  ChevronRight,
  Crown,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Submit", href: "/submit", icon: Upload },
  { name: "Action Items", href: "/action-items", icon: ClipboardCheck },
  { name: "Info Hub", href: "/updates", icon: FileText },
  { name: "Org Network", href: "/network", icon: Network },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const fullName = user.user_metadata.full_name;
  const userInitials =
    typeof fullName === "string" && fullName.trim().length > 0
      ? fullName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
      : user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-sidebar-primary" />
            <span className="font-semibold text-lg text-sidebar-foreground">
              OrgIntel
            </span>
          </div>
        )}
        {collapsed && (
          <Brain className="h-8 w-8 text-sidebar-primary mx-auto" />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {typeof fullName === "string" ? fullName : user.email || user.id}
              </p>
              {userRole === "founder" && (
                <Badge
                  variant="outline"
                  className="text-xs border-sidebar-primary text-sidebar-primary"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Founder
                </Badge>
              )}
              {userRole === "employee" && (
                <span className="text-xs text-sidebar-foreground/70">
                  Employee
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-3">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
