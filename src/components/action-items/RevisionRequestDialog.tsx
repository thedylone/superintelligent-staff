import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RevisionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  onSubmit: (notes: string) => void;
  isPending: boolean;
}

export function RevisionRequestDialog({
  open,
  onOpenChange,
  itemTitle,
  onSubmit,
  isPending,
}: RevisionRequestDialogProps) {
  const [revisionNotes, setRevisionNotes] = useState("");

  const handleSubmit = () => {
    if (revisionNotes.trim()) {
      onSubmit(revisionNotes);
      setRevisionNotes("");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setRevisionNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Revision</DialogTitle>
          <DialogDescription>
            Provide feedback for "{itemTitle}" explaining what changes are
            needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="revision-notes">Revision Notes *</Label>
            <Textarea
              id="revision-notes"
              placeholder="Please specify what needs to be changed or clarified..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              These notes will be visible to the submitter so they can address
              your feedback.
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
            disabled={!revisionNotes.trim() || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Revision"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
