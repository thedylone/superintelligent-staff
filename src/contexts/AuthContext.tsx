import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setAuthToken } from "@/lib/api";

type UserRole = "founder" | "employee" | null;
type ApprovalStatus = "pending" | "approved" | "rejected" | null;

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type AuthSession = {
  access_token: string;
  token_type: "bearer";
};

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  userRole: UserRole;
  approvalStatus: ApprovalStatus;
  hasProfile: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    let role: UserRole = "employee";
    try {
      const roleResponse = await api.get<{ role: UserRole | null }>(`/api/user-roles/${userId}`);
      role = roleResponse.role || "employee";
    } catch {
      role = "employee";
    }
    setUserRole(role);

    // Fetch profile and approval status
    let profileData: { approval_status?: ApprovalStatus } | null = null;
    try {
      const profileResponse = await api.get<{ profile: { approval_status?: ApprovalStatus } | null }>(
        "/api/profile",
        { userId }
      );
      profileData = profileResponse.profile;
    } catch {
      profileData = null;
    }

    if (profileData) {
      setHasProfile(true);
      // Founders are always considered approved
      if (role === "founder") {
        setApprovalStatus("approved");
      } else {
        setApprovalStatus(profileData.approval_status as ApprovalStatus);
      }
    } else {
      setHasProfile(false);
      setApprovalStatus(null);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await api.get<{ user: AuthUser; token: string }>("/api/auth/session");
        const nextSession: AuthSession = { access_token: response.token, token_type: "bearer" };
        setSession(nextSession);
        setUser(response.user);
        setAuthToken(response.token);
        await fetchUserData(response.user.id);
      } catch {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setApprovalStatus(null);
        setHasProfile(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const signOut = async () => {
    try {
      await api.post("/api/auth/sign-out");
    } finally {
      setAuthToken(null);
    }
    setUser(null);
    setSession(null);
    setUserRole(null);
    setApprovalStatus(null);
    setHasProfile(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, approvalStatus, hasProfile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
