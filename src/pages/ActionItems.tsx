import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, Search, Loader2, ArrowUpDown } from "lucide-react";
import {
  useActionItems,
  useUpdateActionItem,
  SortField,
  SortOrder,
} from "@/hooks/useActionItems";
import { useLogActivity } from "@/hooks/useActivityLog";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationRecipients } from "@/hooks/useNotificationRecipients";
import type { ActionItem, ActionPriority, ActionStatus } from "@/types/db";

import { ActionItemCard } from "@/components/action-items/ActionItemCard";
import { RevisionRequestDialog } from "@/components/action-items/RevisionRequestDialog";
import { EditActionItemDialog } from "@/components/action-items/EditActionItemDialog";
import { NotificationDialog } from "@/components/action-items/NotificationDialog";

export default function ActionItems() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActionStatus | "all">("pending");
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Dialog states
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);

  const { userRole, user } = useAuth();
  const { data: actionItems, isLoading } = useActionItems({
    status: activeTab,
    sortBy,
    sortOrder,
  });
  const updateActionItem = useUpdateActionItem();
  const logActivity = useLogActivity();
  const {
    dialogOpen: notificationDialogOpen,
    setDialogOpen: setNotificationDialogOpen,
    suggestRecipients,
    isLoading: notificationLoading,
    recipients,
    reasoning,
    actionTitle,
    decision,
    emailSubject,
    emailBody,
  } = useNotificationRecipients();

  const filteredItems =
    actionItems?.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }) || [];

  const handleApprove = (item: ActionItem) => {
    updateActionItem.mutate(
      { id: item.id, updates: { status: "approved" } },
      {
        onSuccess: () => {
          logActivity.mutate({
            action: "approved",
            target: item.title,
            targetType: "action_item",
          });
          // Trigger AI-powered notification suggestion
          suggestRecipients(item, "approved");
        },
      }
    );
  };

  const handleReject = (item: ActionItem) => {
    updateActionItem.mutate(
      { id: item.id, updates: { status: "rejected" } },
      {
        onSuccess: () => {
          logActivity.mutate({
            action: "rejected",
            target: item.title,
            targetType: "action_item",
          });
          // Trigger AI-powered notification suggestion
          suggestRecipients(item, "rejected");
        },
      }
    );
  };

  const handleRequestRevision = (item: ActionItem) => {
    setSelectedItem(item);
    setRevisionDialogOpen(true);
  };

  const handleRevisionSubmit = (notes: string) => {
    if (!selectedItem) return;
    const itemToNotify = selectedItem;

    updateActionItem.mutate(
      {
        id: selectedItem.id,
        updates: {
          status: "revision",
          revision_notes: notes,
        },
      },
      {
        onSuccess: () => {
          logActivity.mutate({
            action: "revision",
            target: itemToNotify.title,
            targetType: "action_item",
          });
          setRevisionDialogOpen(false);
          setSelectedItem(null);
          // Trigger AI-powered notification suggestion
          suggestRecipients(itemToNotify, "revision");
        },
      }
    );
  };

  const handleEdit = (item: ActionItem) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (updates: {
    title: string;
    summary: string;
    details: string | null;
    priority: ActionPriority;
    deadline: string | null;
  }) => {
    if (!selectedItem) return;

    updateActionItem.mutate(
      {
        id: selectedItem.id,
        updates: {
          ...updates,
          status: "pending",
          revision_notes: null,
        },
      },
      {
        onSuccess: () => {
          logActivity.mutate({
            action: "resubmitted",
            target: updates.title,
            targetType: "action_item",
          });
          setEditDialogOpen(false);
          setSelectedItem(null);
        },
      }
    );
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const isFounder = userRole === "founder";

  // Any authenticated user can edit revision items (except founders who approve/reject)
  const canEditItem = (item: ActionItem) => {
    if (isFounder) return false; // Founders don't edit, they approve/reject
    return true; // Any authenticated user can edit revision items
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8" />
            Action Items
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve pending items requiring your attention.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Created</SelectItem>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="importance">Importance</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={toggleSortOrder}>
          <ArrowUpDown
            className={`h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ActionStatus | "all")}
      >
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="revision">Needs Revision</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-4">
            {isLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </Card>
            ) : filteredItems.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No action items found</p>
              </Card>
            ) : (
              filteredItems.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  isFounder={isFounder}
                  canEdit={canEditItem(item)}
                  onApprove={() => handleApprove(item)}
                  onReject={() => handleReject(item)}
                  onRequestRevision={() => handleRequestRevision(item)}
                  onEdit={() => handleEdit(item)}
                  isUpdating={updateActionItem.isPending}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RevisionRequestDialog
        open={revisionDialogOpen}
        onOpenChange={setRevisionDialogOpen}
        itemTitle={selectedItem?.title || ""}
        onSubmit={handleRevisionSubmit}
        isPending={updateActionItem.isPending}
      />

      <EditActionItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={selectedItem}
        onSubmit={handleEditSubmit}
        isPending={updateActionItem.isPending}
      />

      <NotificationDialog
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}
        actionTitle={actionTitle}
        decision={decision}
        recipients={recipients}
        reasoning={reasoning}
        isLoading={notificationLoading}
        emailSubject={emailSubject}
        emailBody={emailBody}
      />
    </div>
  );
}
