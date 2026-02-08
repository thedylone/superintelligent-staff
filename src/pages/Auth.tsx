import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Chrome } from "lucide-react";
import { api, setAuthToken } from "@/lib/api";
import { toast } from "sonner";

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential: string;
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        setGoogleLoaded(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = async (response: GoogleCredentialResponse) => {
    setIsLoading(true);
    try {
      const result = await api.post<{
        redirected: boolean;
        redirectUrl?: string;
        token?: string;
      }>("/api/auth/google", {
        credential: response.credential,
      });

      if (result.redirected && result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      if (!result.token) {
        toast.error("Sign in failed");
        return;
      }

      setAuthToken(result.token);
      toast.success("Signed in successfully!");
      window.location.href = "/";
    } catch (error) {
      toast.error("An error occurred during sign in");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (window.google && googleLoaded) {
      window.google.accounts.id.prompt();
    } else {
      toast.error("Google Sign-In is not available");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-12 w-12 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">OrgIntel</h1>
          </div>
          <p className="text-muted-foreground">
            Organizational Intelligence Dashboard
          </p>
        </div>

        {/* Sign In Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in with your company Google account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-12 text-base"
              variant="outline"
            >
              <Chrome className="h-5 w-5 mr-3" />
              {isLoading ? "Signing in..." : "Continue with Google"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </CardContent>
        </Card>

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground">
          Only authorized company members can access this dashboard.
        </p>
      </div>
    </div>
  );
}
