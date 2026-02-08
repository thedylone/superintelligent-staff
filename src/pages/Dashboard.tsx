import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck,
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { QuickStatsChart } from "@/components/dashboard/QuickStatsChart";
import { PendingActionsList } from "@/components/dashboard/PendingActionsList";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  const statsDisplay = [
    {
      title: "Pending Actions",
      value: stats?.pendingActions ?? "-",
      change: "Awaiting review",
      icon: ClipboardCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Updates",
      value: stats?.activeUpdates ?? "-",
      change: "Total updates",
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Team Members",
      value: stats?.teamMembers ?? "-",
      change: "Approved members",
      icon: Users,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      title: "Approved Items",
      value: stats?.approvedActions ?? "-",
      change: "Total resolved",
      icon: FileText,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening in your organization.
          </p>
        </div>
        <Button asChild>
          <Link to="/action-items">
            Review Action Items <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions - Takes 2 columns */}
        <div className="lg:col-span-2">
          <PendingActionsList />
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <RecentActivityFeed />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickStatsChart />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Resolution Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium">Approved</span>
                </div>
                <span className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    stats?.approvedActions ?? 0
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="font-medium">Pending</span>
                </div>
                <span className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    stats?.pendingActions ?? 0
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Needs Revision</span>
                </div>
                <span className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    stats?.revisionActions ?? 0
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
