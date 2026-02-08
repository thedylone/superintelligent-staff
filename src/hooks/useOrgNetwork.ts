import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type OrgNetworkResponse = {
  nodeCounts: { label: string; count: number }[];
  relationshipCounts: { type: string; count: number }[];
  topConnectors: {
    id: string;
    name: string;
    email: string | null;
    role: string | null;
    department: string | null;
    title: string | null;
    connections: number;
  }[];
  recentConnections: {
    type: string;
    created_at: string | null;
    from: { id: string; name: string };
    to: { id: string; label: string; name: string };
  }[];
  orgChartNodes: {
    id: string;
    name: string;
    email: string | null;
    title: string | null;
    department: string | null;
    role: string | null;
    managerId: string | null;
  }[];
};

export function useOrgNetwork() {
  return useQuery({
    queryKey: ["org_network"],
    queryFn: async () => {
      return api.get<OrgNetworkResponse>("/api/org-network");
    },
  });
}
