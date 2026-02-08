import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  X,
  AlertTriangle,
  Clock,
  Zap,
  MessageSquare,
  Edit,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { ActionItem, ActionPriority } from "@/types/db";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { CommentSection } from "./CommentSection";

const priorityConfig: Record<
  ActionPriority,
  { label: string; icon: typeof AlertTriangle; className: string }
> = {
  high: {
    label: "High Priority",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  medium: {
    label: "Medium",
    icon: Zap,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  low: {
    label: "Low",
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
  approved: { label: "Approved", className: "bg-success/10 text-success" },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive",
  },
  revision: {
    label: "Needs Revision",
    className: "bg-primary/10 text-primary",
  },
};

interface ActionItemCardProps {
  item: ActionItem;
  isFounder: boolean;
  canEdit: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRequestRevision: () => void;
  onEdit: () => void;
  isUpdating: boolean;
}

export function ActionItemCard({
  item,
  isFounder,
  canEdit,
  onApprove,
  onReject,
  onRequestRevision,
  onEdit,
  isUpdating,
}: ActionItemCardProps) {
  const priority = priorityConfig[item.priority];
  const status = statusConfig[item.status];

  return (
    <Card className="overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value={item.id} className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
            <div className="flex items-start gap-4 text-left flex-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold">{item.title}</h3>
                  <Badge variant="outline" className={priority.className}>
                    <priority.icon className="h-3 w-3 mr-1" />
                    {priority.label}
                  </Badge>
                  <Badge className={status.className}>{status.label}</Badge>
                  {item.importance && item.importance >= 7 && (
                    <Badge variant="secondary">
                      Importance: {item.importance}/10
                    </Badge>
                  )}
                </div>
                <div className="line-clamp-2">
                  <MarkdownContent content={item.summary} />
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>{item.source || "Unknown source"}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {item.deadline && item.deadline != "null" && (
                    <>
                      <span>•</span>
                      <span
                        className={
                          new Date(item.deadline) < new Date()
                            ? "text-destructive font-medium"
                            : "text-warning"
                        }
                      >
                        Due: {format(new Date(item.deadline), "MMM d, yyyy")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6 space-y-6">
              {/* Revision Notes Alert */}
              {item.revision_notes && item.status === "revision" && (
                <Alert className="border-primary/50 bg-primary/5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="font-medium text-primary mb-1">
                      Revision Notes:
                    </div>
                    <MarkdownContent content={item.revision_notes} />
                  </AlertDescription>
                </Alert>
              )}

              {/* Detailed Content */}
              <div className="bg-muted/50 rounded-lg p-4">
                <MarkdownContent content={item.details || item.summary} />
              </div>

              {/* Action Buttons - Founders can approve/reject/request revision for pending items */}
              {isFounder && item.status === "pending" && (
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    onClick={onApprove}
                    className="bg-success hover:bg-success/90"
                    disabled={isUpdating}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onReject}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onRequestRevision}
                    disabled={isUpdating}
                  >
                    Request Revision
                  </Button>
                </div>
              )}

              {/* Edit/Resubmit Button - For employees with revision items */}
              {canEdit && item.status === "revision" && (
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button onClick={onEdit} disabled={isUpdating}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit & Resubmit
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Address the revision notes and resubmit for approval
                  </span>
                </div>
              )}

              {/* Comments Section */}
              <CommentSection actionItemId={item.id} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
