import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useActionItemComments, useAddComment } from "@/hooks/useActionItems";

interface CommentSectionProps {
  actionItemId: string;
}

export function CommentSection({ actionItemId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const { data: comments, isLoading } = useActionItemComments(actionItemId);
  const addComment = useAddComment();

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment.mutate({ actionItemId, content: newComment });
      setNewComment("");
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="font-semibold flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments?.length || 0})
      </h4>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        comments?.map((comment) => (
          <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {comment.user_name || "Unknown User"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>
        ))
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
        />
        <Button
          size="icon"
          onClick={handleAddComment}
          disabled={!newComment.trim() || addComment.isPending}
        >
          {addComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
