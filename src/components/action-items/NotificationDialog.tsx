import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Check, Loader2, Users, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ui/markdown-content";

interface Recipient {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  role_title: string | null;
}

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionTitle: string;
  decision: "approved" | "rejected" | "revision";
  recipients: Recipient[];
  reasoning: string;
  isLoading: boolean;
  emailSubject: string;
  emailBody: string;
}

export function NotificationDialog({
  open,
  onOpenChange,
  actionTitle,
  decision,
  recipients,
  reasoning,
  isLoading,
  emailSubject,
  emailBody,
}: NotificationDialogProps) {
  const [sendingState, setSendingState] = useState<"idle" | "sending" | "sent">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSendingState("idle");
      setProgress(0);
      setSentCount(0);
    }
  }, [open]);

  const handleSendNotifications = () => {
    if (recipients.length === 0) return;

    setSendingState("sending");
    setProgress(0);
    setSentCount(0);

    // Simulate sending emails one by one
    const totalRecipients = recipients.length;
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex++;
      setSentCount(currentIndex);
      setProgress((currentIndex / totalRecipients) * 100);

      if (currentIndex >= totalRecipients) {
        clearInterval(interval);
        setTimeout(() => {
          setSendingState("sent");
        }, 500);
      }
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Email Notification Preview
          </DialogTitle>
          <DialogDescription>
            AI-generated notification for "{actionTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Decision Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Decision:</span>
            <Badge
              className={cn(
                decision === "approved"
                  ? "bg-success/10 text-success"
                  : decision === "revision"
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {decision.charAt(0).toUpperCase() + decision.slice(1)}
            </Badge>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <span className="text-muted-foreground">
                Generating notification content...
              </span>
            </div>
          )}

          {/* Content Tabs */}
          {!isLoading && (recipients.length > 0 || emailBody) && (
            <Tabs defaultValue="email" className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Email Content
                </TabsTrigger>
                <TabsTrigger
                  value="recipients"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Recipients ({recipients.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-4 space-y-4">
                {/* Email Subject */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Subject
                  </label>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="font-medium">
                      {emailSubject || "No subject generated"}
                    </p>
                  </div>
                </div>

                {/* Email Body */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email Body
                  </label>
                  <ScrollArea className="h-48 rounded-lg border bg-card p-4">
                    {emailBody ? (
                      <MarkdownContent content={emailBody} />
                    ) : (
                      <p className="text-muted-foreground italic">
                        No email content generated
                      </p>
                    )}
                  </ScrollArea>
                </div>

                {/* AI Reasoning */}
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">AI Reasoning:</span>{" "}
                    {reasoning}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="recipients" className="mt-4 space-y-4">
                {recipients.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                      {recipients.map((recipient, index) => (
                        <div
                          key={recipient.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border bg-card transition-all",
                            sendingState === "sending" &&
                              sentCount > index &&
                              "bg-success/5 border-success/30",
                            sendingState === "sent" &&
                              "bg-success/5 border-success/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                                sendingState === "idle" && "bg-muted",
                                sendingState === "sending" &&
                                  sentCount > index &&
                                  "bg-success/20",
                                sendingState === "sent" && "bg-success/20"
                              )}
                            >
                              {sendingState === "sending" &&
                              sentCount === index + 1 ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : sendingState !== "idle" &&
                                sentCount >= index + 1 ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <Mail className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {recipient.full_name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {recipient.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              {recipient.department || "—"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No recipients suggested
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* No Content State */}
          {!isLoading && recipients.length === 0 && !emailBody && (
            <div className="text-center py-6">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {reasoning || "No notification content generated."}
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {sendingState === "sending" && (
          <div className="space-y-2 pt-4">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Sending notifications... ({sentCount}/{recipients.length})
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {sendingState === "idle" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Skip
              </Button>
              <Button
                onClick={handleSendNotifications}
                disabled={recipients.length === 0}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send to {recipients.length}{" "}
                {recipients.length === 1 ? "Recipient" : "Recipients"}
              </Button>
            </>
          )}
          {sendingState === "sent" && (
            <Button onClick={() => onOpenChange(false)}>
              <Check className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
