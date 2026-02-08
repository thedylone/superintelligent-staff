import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  Loader2,
  Users,
  Briefcase,
  DollarSign,
  FlaskConical,
  FileAudio,
  Image,
  AlertCircle,
  FileInput,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useFilteredInformation, useRawSubmissions, type FilteredInformation, type RawSubmission } from "@/hooks/useSubmissions";
import { MarkdownContent } from "@/components/ui/markdown-content";

type ViewType = "all" | "filtered" | "raw";

const typeConfig: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  meeting: { icon: MessageSquare, color: "text-chart-3", label: "Meeting" },
  email: { icon: FileText, color: "text-primary", label: "Email" },
  leadership: { icon: Users, color: "text-chart-1", label: "Leadership" },
  hiring: { icon: Briefcase, color: "text-chart-2", label: "Hiring" },
  budget: { icon: DollarSign, color: "text-chart-4", label: "Budget" },
  research_review: { icon: FlaskConical, color: "text-accent", label: "Research" },
  cross_team_sync: { icon: Users, color: "text-chart-5", label: "Cross-Team" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  medium: { label: "Medium", className: "bg-primary/10 text-primary" },
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
};

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  notes_drafted: { label: "Drafted", icon: Clock, className: "bg-muted text-muted-foreground" },
  action_items_identified: { label: "Actions Identified", icon: TrendingUp, className: "bg-primary/10 text-primary" },
  in_progress: { label: "In Progress", icon: Clock, className: "bg-warning/10 text-warning" },
  closed: { label: "Closed", icon: CheckCircle, className: "bg-success/10 text-success" },
};

const processingStatusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-muted text-muted-foreground" },
  processing: { label: "Processing", icon: Loader2, className: "bg-primary/10 text-primary" },
  completed: { label: "Completed", icon: CheckCircle, className: "bg-success/10 text-success" },
  failed: { label: "Failed", icon: AlertCircle, className: "bg-destructive/10 text-destructive" },
};

function FilteredInfoCard({ update }: { update: FilteredInformation }) {
  const [isOpen, setIsOpen] = useState(false);
  const type = typeConfig[update.information_type] || typeConfig.meeting;
  const priority = priorityConfig[update.strategic_priority] || priorityConfig.medium;
  const status = statusConfig[update.status] || statusConfig.notes_drafted;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="relative ml-4 hover:shadow-md transition-shadow">
        <div className="absolute -left-[26px] top-6 w-3 h-3 rounded-full bg-background border-2 border-primary" />
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg bg-muted ${type.color}`}>
              <type.icon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Filtered</Badge>
                    <h3 className="font-semibold text-lg">{update.title}</h3>
                  </div>
                  <div className={!isOpen ? 'line-clamp-2' : ''}>
                    <MarkdownContent content={update.summary} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Badge className={priority.className}>
                    {priority.label}
                  </Badge>
                  <Badge variant="outline" className={status.className}>
                    <status.icon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </div>

              <CollapsibleContent className="mt-4 space-y-3">
                {update.structured_notes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Structured Notes</p>
                    <MarkdownContent content={update.structured_notes} />
                  </div>
                )}
                {update.potential_action_items && Array.isArray(update.potential_action_items) && update.potential_action_items.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Potential Action Items</p>
                    <ul className="text-sm space-y-1">
                      {update.potential_action_items.map((item: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{item.task || item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CollapsibleContent>

              <div className="flex flex-wrap items-center gap-4 mt-3">
                <Badge variant="secondary">
                  <type.icon className="h-3 w-3 mr-1" />
                  {type.label}
                </Badge>
                {update.teams_involved?.map((team) => (
                  <Badge key={team} variant="outline">
                    {team}
                  </Badge>
                ))}
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                </span>
                <CollapsibleTrigger asChild>
                  <button className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {isOpen ? 'Show less' : 'Show more'}
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

function RawSubmissionCard({ submission }: { submission: RawSubmission }) {
  const [isOpen, setIsOpen] = useState(false);
  const status = processingStatusConfig[submission.processing_status] || processingStatusConfig.pending;
  const hasAudio = !!submission.audio_file_url;
  const hasImages = submission.image_urls && submission.image_urls.length > 0;
  const hasText = !!submission.text_input;

  const hasExpandableContent = (hasText && submission.text_input && submission.text_input.length > 150) ||
    (submission.audio_transcript && submission.audio_transcript.length > 100) ||
    hasImages;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="relative ml-4 hover:shadow-md transition-shadow">
        <div className="absolute -left-[26px] top-6 w-3 h-3 rounded-full bg-background border-2 border-muted-foreground" />
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <FileInput className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-muted">Raw</Badge>
                    <h3 className="font-semibold text-lg">Raw Submission</h3>
                  </div>
                  {hasText && (
                    <p className={`text-sm text-muted-foreground mt-1 ${!isOpen ? 'line-clamp-3' : ''}`}>
                      {submission.text_input}
                    </p>
                  )}
                  {submission.audio_transcript && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Transcript:</p>
                      <p className={`text-sm text-muted-foreground italic ${!isOpen ? 'line-clamp-2' : ''}`}>
                        "{submission.audio_transcript}"
                      </p>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className={status.className}>
                  <status.icon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              <CollapsibleContent className="mt-4 space-y-3">
                {hasImages && submission.image_urls && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Attached Images</p>
                    <div className="flex flex-wrap gap-2">
                      {submission.image_urls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={url} alt={`Attachment ${idx + 1}`} className="h-20 w-20 object-cover rounded border" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {submission.audio_file_url && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Audio File</p>
                    <audio controls className="w-full">
                      <source src={submission.audio_file_url} />
                    </audio>
                  </div>
                )}
              </CollapsibleContent>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                {hasText && (
                  <Badge variant="secondary">
                    <FileText className="h-3 w-3 mr-1" />
                    Text
                  </Badge>
                )}
                {hasAudio && (
                  <Badge variant="secondary">
                    <FileAudio className="h-3 w-3 mr-1" />
                    Audio
                  </Badge>
                )}
                {hasImages && (
                  <Badge variant="secondary">
                    <Image className="h-3 w-3 mr-1" />
                    {submission.image_urls?.length} Image{submission.image_urls?.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                </span>
                {hasExpandableContent && (
                  <CollapsibleTrigger asChild>
                    <button className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {isOpen ? 'Show less' : 'Show more'}
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                )}
              </div>

              {submission.processing_error && (
                <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                  Error: {submission.processing_error}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

type CombinedItem = 
  | { type: 'filtered'; data: FilteredInformation }
  | { type: 'raw'; data: RawSubmission };

export default function Updates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<ViewType>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [processingStatusFilter, setProcessingStatusFilter] = useState<string>("all");

  const { data: filteredInfo = [], isLoading: isLoadingFiltered } = useFilteredInformation();
  const { data: rawSubmissions = [], isLoading: isLoadingRaw } = useRawSubmissions();

  const isLoading = isLoadingFiltered || isLoadingRaw;

  // Combine and filter items
  const combinedItems: CombinedItem[] = [];

  // Add filtered information
  if (viewType === "all" || viewType === "filtered") {
    filteredInfo.forEach(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || item.information_type === typeFilter;
      const matchesPriority = priorityFilter === "all" || item.strategic_priority === priorityFilter;

      if (matchesSearch && matchesType && matchesPriority) {
        combinedItems.push({ type: 'filtered', data: item });
      }
    });
  }

  // Add raw submissions
  if (viewType === "all" || viewType === "raw") {
    rawSubmissions.forEach(item => {
      const matchesSearch =
        (item.text_input?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (item.audio_transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesProcessingStatus = processingStatusFilter === "all" || item.processing_status === processingStatusFilter;

      if (matchesSearch && matchesProcessingStatus) {
        combinedItems.push({ type: 'raw', data: item });
      }
    });
  }

  // Sort by created_at descending
  combinedItems.sort((a, b) => 
    new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
  );

  // Group by date
  const groupedItems = combinedItems.reduce((groups, item) => {
    const date = format(new Date(item.data.created_at), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, CombinedItem[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Information Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            View raw submissions and AI-processed information.
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({filteredInfo.length + rawSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="filtered">
            Filtered ({filteredInfo.length})
          </TabsTrigger>
          <TabsTrigger value="raw">
            Raw ({rawSubmissions.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtered info specific filters */}
        {(viewType === "all" || viewType === "filtered") && (
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="leadership">Leadership</SelectItem>
                <SelectItem value="hiring">Hiring</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="research_review">Research</SelectItem>
                <SelectItem value="cross_team_sync">Cross-Team</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {/* Raw submission specific filters */}
        {(viewType === "all" || viewType === "raw") && (
          <Select value={processingStatusFilter} onValueChange={setProcessingStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Timeline */}
      {!isLoading && (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([date, items]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(date), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Items for this date */}
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                {items.map((item) => (
                  item.type === 'filtered' 
                    ? <FilteredInfoCard key={`filtered-${item.data.id}`} update={item.data} />
                    : <RawSubmissionCard key={`raw-${item.data.id}`} submission={item.data} />
                ))}
              </div>
            </div>
          ))}

          {combinedItems.length === 0 && !isLoading && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No information found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submit content to see raw and processed information here
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
