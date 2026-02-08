import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { ActionItem, ActionPriority } from "@/types/db";
import { MarkdownContent } from "@/components/ui/markdown-content";

interface EditActionItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ActionItem | null;
  onSubmit: (updates: {
    title: string;
    summary: string;
    details: string | null;
    priority: ActionPriority;
    deadline: string | null;
  }) => void;
  isPending: boolean;
}

export function EditActionItemDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isPending,
}: EditActionItemDialogProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState<ActionPriority>("medium");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setSummary(item.summary);
      setDetails(item.details || "");
      setPriority(item.priority);
      setDeadline(
        item.deadline && item.deadline != "null"
          ? new Date(item.deadline)
          : undefined
      );
    }
  }, [item]);

  const handleSubmit = () => {
    if (title.trim() && summary.trim()) {
      onSubmit({
        title: title.trim(),
        summary: summary.trim(),
        details: details.trim() || null,
        priority,
        deadline: deadline ? deadline.toISOString() : null,
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit & Resubmit Action Item</DialogTitle>
          <DialogDescription>
            Address the revision feedback and resubmit for approval.
          </DialogDescription>
        </DialogHeader>

        {/* Revision Notes Alert */}
        {item.revision_notes && (
          <Alert className="border-warning/50 bg-warning/10">
            <MessageSquare className="h-4 w-4 text-warning" />
            <AlertDescription>
              <div className="font-medium text-warning mb-1">
                Revision Requested:
              </div>
              <div className="text-sm">
                <MarkdownContent content={item.revision_notes} />
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Action item title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as ActionPriority)}
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? (
                      format(deadline, "PPP")
                    ) : (
                      <span>No due date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  {deadline && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDeadline(undefined)}
                      >
                        Clear due date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-summary">Summary *</Label>
            <Textarea
              id="edit-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of the action item"
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Supports Markdown formatting.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-details">Details</Label>
            <Textarea
              id="edit-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details, context, or supporting information..."
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Supports Markdown formatting. Include any clarifications
              requested.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !summary.trim() || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resubmitting...
              </>
            ) : (
              "Resubmit for Approval"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
