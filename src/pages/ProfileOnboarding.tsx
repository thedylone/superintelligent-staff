import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { Brain, Loader2, Clock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function ProfileOnboarding() {
  const { user, refreshUserData } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    department: "",
    role_title: "",
  });

  // Initialize form with user data or existing profile
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || prev.email,
        full_name: user.full_name || prev.full_name,
      }));
    }
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || user?.email || "",
        department: profile.department || "",
        role_title: profile.role_title || "",
      });
    }
  }, [user, profile]);

  // Poll for approval status changes and redirect when approved
  useEffect(() => {
    if (!user || !profile || profile.approval_status !== "pending") return;

    const pollInterval = setInterval(async () => {
      const response = await api.get<{ profile: { approval_status?: string } | null }>(
        "/api/profile",
        {
          userId: user.id,
        }
      );

      if (response.profile?.approval_status === "approved") {
        clearInterval(pollInterval);
        await refreshUserData();
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        toast.success("Your profile has been approved!");
        navigate("/", { replace: true });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(pollInterval);
  }, [user, profile?.approval_status, navigate, queryClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    const isFirstTime = !profile?.approval_status;
    const updates = {
      ...formData,
      ...(isFirstTime ? { approval_status: "pending" } : {}),
    };

    updateProfile.mutate(updates, {
      onSuccess: () => {
        if (isFirstTime) {
          toast.success("Profile submitted for approval");
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        } else {
          setIsEditing(false);
        }
      },
      onError: (error) => {
        toast.error("Failed to submit profile", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      },
    });
  };

  const { userRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already approved (or is a founder), redirect to dashboard
  if (profile?.approval_status === "approved" || userRole === "founder") {
    return <Navigate to="/" replace />;
  }

  // Show pending status if profile is awaiting approval
  if (profile?.approval_status === "pending" && !isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-12 w-12 text-warning" />
            </div>
            <CardTitle>Pending Approval</CardTitle>
            <CardDescription>
              Your account is awaiting approval from an administrator. You'll receive access once approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">{profile.full_name}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{profile.email}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Department:</span>{" "}
                <span className="font-medium">{profile.department || "Not specified"}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Role:</span>{" "}
                <span className="font-medium">{profile.role_title || "Not specified"}</span>
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setFormData({
                  full_name: profile.full_name || "",
                  email: profile.email || "",
                  department: profile.department || "",
                  role_title: profile.role_title || "",
                });
                setIsEditing(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Update Information
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show rejected status
  if (profile?.approval_status === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              Your access request has been denied. Please contact an administrator for more information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-12 w-12 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">OrgIntel</h1>
          </div>
          <p className="text-muted-foreground">
            {isEditing ? "Update your profile information" : "Complete your profile to continue"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Update Profile" : "Welcome!"}</CardTitle>
            <CardDescription>
              {isEditing 
                ? "Make changes to your profile. Your account is still pending approval."
                : "Please fill in your information. Your access will be reviewed by an administrator."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Engineering, Marketing, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role_title">Role / Title</Label>
                <Input
                  id="role_title"
                  value={formData.role_title}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                  placeholder="Software Engineer, Product Manager, etc."
                />
              </div>

              <div className="flex gap-2">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  className={isEditing ? "flex-1" : "w-full"}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditing ? "Saving..." : "Submitting..."}
                    </>
                  ) : (
                    isEditing ? "Save Changes" : "Submit for Approval"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
