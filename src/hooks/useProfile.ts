import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Profile, ProfileUpdate } from "@/types/db";
import { api } from "@/lib/api";

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const response = await api.get<{ profile: Profile | null }>(
        "/api/profile",
        { userId: user.id }
      );
      return response.profile ?? null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user) throw new Error("Must be logged in");

      return api.patch("/api/profile", {
        userId: user.id,
        updates: {
          ...updates,
          updated_at: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error("Failed to update profile", { description: error.message });
    },
  });
}

export function usePendingApprovals() {
  const { userRole } = useAuth();

  return useQuery({
    queryKey: ["pending_profiles"],
    queryFn: async () => {
      const response = await api.get<{ profiles: unknown[] }>(
        "/api/profiles/pending"
      );
      return response.profiles;
    },
    enabled: userRole === "founder",
  });
}

export function useApproveProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      profileId,
      status,
    }: {
      profileId: string;
      status: "approved" | "rejected";
    }) => {
      if (!user) throw new Error("Must be logged in");

      return api.patch(`/api/profiles/${profileId}/approval`, {
        status,
        approvedBy: user.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending_profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`Profile ${variables.status}`);
    },
    onError: (error) => {
      toast.error("Failed to update profile status", {
        description: error.message,
      });
    },
  });
}
