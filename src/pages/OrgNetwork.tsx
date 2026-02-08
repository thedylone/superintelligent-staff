import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrgNetwork } from "@/hooks/useOrgNetwork";
import { api } from "@/lib/api";
import { Network, RefreshCw, Users, Link2, Loader2 } from "lucide-react";

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);

type OrgChartNode = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  department: string | null;
  role: string | null;
  managerId: string | null;
  reports: OrgChartNode[];
};

const buildOrgChart = (nodes: OrgChartNode[]) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: OrgChartNode[] = [];

  nodes.forEach((node) => {
    const managerId = node.managerId;
    const manager = managerId ? byId.get(managerId) : null;
    if (manager && manager.id !== node.id) {
      manager.reports.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const OrgChartNodeCard = ({ node }: { node: OrgChartNode }) => {
  return (
    <div className="org-card rounded-lg border border-border/60 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{node.name}</p>
          <p className="text-xs text-muted-foreground">
            {node.title || node.department || node.email || "No details"}
          </p>
        </div>
        {node.role ? <Badge variant="secondary">{node.role}</Badge> : null}
      </div>
      {node.department ? (
        <div className="mt-2">
          <Badge variant="outline">{node.department}</Badge>
        </div>
      ) : null}
    </div>
  );
};

const OrgChartTree = ({ roots }: { roots: OrgChartNode[] }) => {
  const renderNode = (node: OrgChartNode) => {
    return (
      <li key={node.id}>
        <OrgChartNodeCard node={node} />
        {node.reports.length ? (
          <ul>
            {node.reports.map((report) => renderNode(report))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <div className="org-tree">
      <style>{`
        .org-tree ul {
          padding-top: 20px;
          position: relative;
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .org-tree li {
          list-style-type: none;
          text-align: center;
          position: relative;
          padding: 20px 10px 0 10px;
        }
        .org-tree li::before,
        .org-tree li::after {
          content: "";
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 1px solid hsl(var(--border));
          width: 50%;
          height: 20px;
        }
        .org-tree li::after {
          right: auto;
          left: 50%;
          border-left: 1px solid hsl(var(--border));
        }
        .org-tree li:only-child::after,
        .org-tree li:only-child::before {
          display: none;
        }
        .org-tree li:only-child {
          padding-top: 0;
        }
        .org-tree li:first-child::before {
          border: 0;
        }
        .org-tree li:last-child::after {
          border: 0;
        }
        .org-tree ul ul::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 1px solid hsl(var(--border));
          width: 0;
          height: 20px;
        }
        .org-tree .org-card {
          display: inline-block;
          min-width: 200px;
        }
      `}</style>
      <ul>{roots.map((root) => renderNode(root))}</ul>
    </div>
  );
};

export default function OrgNetwork() {
  const [isSeeding, setIsSeeding] = useState(false);
  const { data, isLoading, isFetching, error, refetch } = useOrgNetwork();
  const totalNodes =
    data?.nodeCounts.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const totalRelationships =
    data?.relationshipCounts.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const orgChartRoots = data?.orgChartNodes?.length
    ? buildOrgChart(
        data.orgChartNodes.map((node) => ({
          ...node,
          reports: [],
        }))
      )
    : [];

  const handleSeedUsers = async () => {
    try {
      setIsSeeding(true);
      await api.post("/api/org-network/seed-users", {
        count: 8,
      });
      await refetch();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Network className="h-8 w-8" />
            Organization Network
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore team connections, shared artifacts, and relationship density.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleSeedUsers}
            disabled={isSeeding || true}
          >
            {isSeeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            <span className="ml-2">Add sample users</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Unable to load network data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            We couldn't reach the graph database. Check your Neo4j
            credentials and try again.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Nodes
                </p>
                <p className="text-3xl font-bold mt-1">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCount(totalNodes)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all entity types
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Network className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Relationships
                </p>
                <p className="text-3xl font-bold mt-1">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCount(totalRelationships)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Direct links between nodes
                </p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <Link2 className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Connectors
                </p>
                <p className="text-3xl font-bold mt-1">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    formatCount(data?.topConnectors.length ?? 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  People with the most links
                </p>
              </div>
              <div className="p-3 rounded-xl bg-chart-4/10">
                <Users className="h-6 w-6 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Chart</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : orgChartRoots.length ? (
            <OrgChartTree roots={orgChartRoots} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No reporting structure available yet. Once managers approve team
              members, the org chart will populate automatically.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Node Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : data?.nodeCounts.length ? (
              data.nodeCounts.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCount(item.count)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No node data available yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relationship Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : data?.relationshipCounts.length ? (
              data.relationshipCounts.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.type}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCount(item.count)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No relationships found yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Top Connectors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : data?.topConnectors.length ? (
              data.topConnectors.map((person) => (
                <div key={person.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {person.title || person.department || person.email || "No details"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCount(person.connections)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {person.role ? <Badge variant="secondary">{person.role}</Badge> : null}
                    {person.department ? (
                      <Badge variant="outline">{person.department}</Badge>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No connector data available yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : data?.recentConnections.length ? (
              data.recentConnections.map((connection, index) => (
                <div
                  key={`${connection.from.id}-${connection.to.id}-${index}`}
                  className="flex flex-col gap-1 rounded-lg border border-border/60 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{connection.from.name}</span>
                    <Badge variant="outline">{connection.type}</Badge>
                    <span className="font-medium">{connection.to.name}</span>
                    <Badge variant="secondary">{connection.to.label}</Badge>
                  </div>
                  {connection.created_at ? (
                    <p className="text-xs text-muted-foreground">
                      Linked on {new Date(connection.created_at).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent relationships recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
