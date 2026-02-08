import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Link,
  Shield,
  Database,
  Key,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, usePendingApprovals, useApproveProfile } from "@/hooks/useProfile";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user, userRole } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: pendingProfiles, isLoading: pendingLoading } = usePendingApprovals();
  const approveProfile = useApproveProfile();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    department: "",
    role_title: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || user?.email || "",
        department: profile.department || "",
        role_title: profile.role_title || "",
      });
    }
  }, [profile, user]);

  const handleSaveProfile = () => {
    updateProfile.mutate(formData);
  };

  const isFounder = userRole === "founder";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, integrations, and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isFounder && (
            <TabsTrigger value="approvals">
              User Approvals
              {pendingProfiles && pendingProfiles.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingProfiles.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Manage your personal information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role / Title</Label>
                      <Input
                        id="role"
                        placeholder="Your role"
                        value={formData.role_title}
                        onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        placeholder="Your department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Approvals Tab - Founders only */}
        {isFounder && (
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pending User Approvals
                </CardTitle>
                <CardDescription>
                  Review and approve new user requests to access the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !pendingProfiles || pendingProfiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending approvals
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {pendingProfiles.map((pendingProfile) => (
                        <div
                          key={pendingProfile.id}
                          className="p-4 border rounded-lg space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">
                                {pendingProfile.full_name || "No name provided"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {pendingProfile.email || "No email provided"}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-warning/10 text-warning">
                              Pending
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Department: </span>
                              {pendingProfile.department || "Not specified"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Role: </span>
                              {pendingProfile.role_title || "Not specified"}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Requested {formatDistanceToNow(new Date(pendingProfile.created_at), { addSuffix: true })}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90"
                              onClick={() => approveProfile.mutate({ profileId: pendingProfile.id, status: "approved" })}
                              disabled={approveProfile.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => approveProfile.mutate({ profileId: pendingProfile.id, status: "rejected" })}
                              disabled={approveProfile.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Content Submission Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Content Submission</CardTitle>
                    <CardDescription>Submit content for AI processing</CardDescription>
                  </div>
                </div>
                <Badge className="bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Submit meeting notes, emails, audio recordings, and images for AI analysis.
                Content is automatically transcribed, filtered, and converted into action items.
              </p>
              <Button asChild>
                <a href="/submit">
                  <Link className="h-4 w-4 mr-2" />
                  Go to Submit Page
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Neo4j Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Neo4j</CardTitle>
                    <CardDescription>Knowledge graph database for relationships</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect to your Neo4j instance to store and query organizational relationships.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="neo4j-uri">Connection URI</Label>
                  <Input id="neo4j-uri" placeholder="neo4j+s://xxxx.neo4j.io" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neo4j-user">Username</Label>
                  <Input id="neo4j-user" placeholder="neo4j" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="neo4j-password">Password</Label>
                  <Input id="neo4j-password" type="password" placeholder="Your password" />
                </div>
              </div>
              <Button>
                <Link className="h-4 w-4 mr-2" />
                Connect Neo4j
              </Button>
            </CardContent>
          </Card>

          {/* AI Gateway */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI Analysis</CardTitle>
                    <CardDescription>Powered by Lovable AI Gateway</CardDescription>
                  </div>
                </div>
                <Badge className="bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI summarization and analysis is automatically configured and ready to use.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about updates and actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Action Items</p>
                  <p className="text-sm text-muted-foreground">Get notified when new items need approval</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Comments & Mentions</p>
                  <p className="text-sm text-muted-foreground">Get notified when someone comments or mentions you</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Digest</p>
                  <p className="text-sm text-muted-foreground">Receive a daily summary of organizational updates</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Report</p>
                  <p className="text-sm text-muted-foreground">Get a weekly analytics report</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Single Sign-On (SSO)</p>
                    <p className="text-sm text-muted-foreground">Signed in with Google</p>
                  </div>
                  <Badge className="bg-success/10 text-success">Active</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Active Sessions</h4>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-muted-foreground">Browser session</p>
                    </div>
                    <Badge variant="outline">This device</Badge>
                  </div>
                </div>
              </div>

              <Button variant="destructive">Sign Out All Devices</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
