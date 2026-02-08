import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Network,
  Database,
  ExternalLink,
} from "lucide-react";

export default function OrgNetwork() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Network className="h-8 w-8" />
            Organization Network
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore team connections, expertise, and relationships.
          </p>
        </div>
      </div>

      {/* Placeholder for Neo4j Integration */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Graph Database Integration Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The Organization Network feature requires a Neo4j graph database connection to visualize 
            team relationships, expertise networks, and organizational structure.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="font-medium">To enable this feature:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Set up a Neo4j database instance (Neo4j Aura recommended)</li>
              <li>Configure the connection credentials in your environment</li>
              <li>Import organizational data using the provided schema</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <a 
                href="https://neo4j.com/cloud/aura/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Neo4j Aura
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schema Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Neo4j Schema (100% Aligned with Supabase)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Node Types */}
          <div>
            <h4 className="font-semibold mb-3">Node Types</h4>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto space-y-4">
              <pre className="text-muted-foreground">{`// ============================================
// PROFILE NODE - Maps to public.profiles
// ============================================
(:Profile {
  id: UUID,                    // profiles.id - PRIMARY KEY, default gen_random_uuid()
  user_id: UUID,               // profiles.user_id - NOT NULL, FK to auth.users
  full_name: String | null,    // profiles.full_name - nullable
  email: String | null,        // profiles.email - nullable
  avatar_url: String | null,   // profiles.avatar_url - nullable
  department: String | null,   // profiles.department - nullable, free text
  role_title: String | null,   // profiles.role_title - nullable, free text
  approval_status: String,     // profiles.approval_status - NOT NULL, default "pending"
  approved_by: UUID | null,    // profiles.approved_by - nullable, FK to auth.users
  approved_at: DateTime | null,// profiles.approved_at - nullable
  created_at: DateTime,        // profiles.created_at - NOT NULL, default now()
  updated_at: DateTime         // profiles.updated_at - NOT NULL, default now()
})

// ============================================
// USER ROLE NODE - Maps to public.user_roles
// ============================================
(:UserRole {
  id: UUID,                    // user_roles.id - PRIMARY KEY, default gen_random_uuid()
  user_id: UUID,               // user_roles.user_id - NOT NULL, FK to auth.users
  role: app_role               // user_roles.role - NOT NULL, ENUM: "founder" | "employee"
})

// ============================================
// RAW SUBMISSION NODE - Maps to public.raw_submissions (DB0)
// ============================================
(:RawSubmission {
  id: UUID,                    // raw_submissions.id - PRIMARY KEY, default gen_random_uuid()
  submitted_by: UUID | null,   // raw_submissions.submitted_by - nullable, FK to auth.users
  text_input: String | null,   // raw_submissions.text_input - nullable
  audio_file_url: String | null, // raw_submissions.audio_file_url - nullable
  audio_transcript: String | null, // raw_submissions.audio_transcript - nullable
  image_urls: [String] | null, // raw_submissions.image_urls - nullable, default '{}'
  processing_status: String,   // raw_submissions.processing_status - NOT NULL, default "pending"
  processing_error: String | null, // raw_submissions.processing_error - nullable
  processed_at: DateTime | null, // raw_submissions.processed_at - nullable
  created_at: DateTime         // raw_submissions.created_at - NOT NULL, default now()
})

// ============================================
// FILTERED INFORMATION NODE - Maps to public.filtered_information (DB1)
// ============================================
(:FilteredInformation {
  id: UUID,                    // filtered_information.id - PRIMARY KEY, default gen_random_uuid()
  raw_submission_id: UUID | null, // filtered_information.raw_submission_id - nullable, FK to raw_submissions
  title: String,               // filtered_information.title - NOT NULL
  summary: String,             // filtered_information.summary - NOT NULL
  structured_notes: String | null, // filtered_information.structured_notes - nullable
  information_type: String,    // filtered_information.information_type - NOT NULL
  information_date: Date,      // filtered_information.information_date - NOT NULL, default CURRENT_DATE
  teams_involved: [String] | null, // filtered_information.teams_involved - nullable, default '{}'
  strategic_priority: String,  // filtered_information.strategic_priority - NOT NULL, default "medium"
  status: String,              // filtered_information.status - NOT NULL, default "notes_drafted"
  potential_action_items: JSON | null, // filtered_information.potential_action_items - nullable, default '[]'
  created_at: DateTime         // filtered_information.created_at - NOT NULL, default now()
})

// ============================================
// ACTION ITEM NODE - Maps to public.action_items (DB2)
// ============================================
(:ActionItem {
  id: UUID,                    // action_items.id - PRIMARY KEY, default gen_random_uuid()
  title: String,               // action_items.title - NOT NULL
  summary: String,             // action_items.summary - NOT NULL
  details: String | null,      // action_items.details - nullable
  status: action_status,       // action_items.status - NOT NULL, default "pending", ENUM
  priority: action_priority,   // action_items.priority - NOT NULL, default "medium", ENUM
  importance: Integer | null,  // action_items.importance - nullable, default 5
  deadline: DateTime | null,   // action_items.deadline - nullable
  revision_notes: String | null, // action_items.revision_notes - nullable
  source: String | null,       // action_items.source - nullable
  source_url: String | null,   // action_items.source_url - nullable
  raw_submission_id: UUID | null, // action_items.raw_submission_id - nullable, FK to raw_submissions
  filtered_info_id: UUID | null, // action_items.filtered_info_id - nullable, FK to filtered_information
  submitted_by: UUID | null,   // action_items.submitted_by - nullable, FK to auth.users
  created_by: UUID | null,     // action_items.created_by - nullable, FK to auth.users
  resolved_by: UUID | null,    // action_items.resolved_by - nullable, FK to auth.users
  resolved_at: DateTime | null, // action_items.resolved_at - nullable
  created_at: DateTime,        // action_items.created_at - NOT NULL, default now()
  updated_at: DateTime         // action_items.updated_at - NOT NULL, default now()
})

// ============================================
// DECISION NODE - Maps to public.decisions_log (DB3)
// ============================================
(:Decision {
  id: UUID,                    // decisions_log.id - PRIMARY KEY, default gen_random_uuid()
  decision_title: String,      // decisions_log.decision_title - NOT NULL
  context: String,             // decisions_log.context - NOT NULL
  decision_date: Date,         // decisions_log.decision_date - NOT NULL, default CURRENT_DATE
  decision_maker: UUID | null, // decisions_log.decision_maker - nullable, FK to auth.users
  is_reversible: Boolean | null, // decisions_log.is_reversible - nullable, default true
  follow_up_required: Boolean | null, // decisions_log.follow_up_required - nullable, default false
  teams_affected: [String] | null, // decisions_log.teams_affected - nullable, default '{}'
  linked_action_item_id: UUID | null, // decisions_log.linked_action_item_id - nullable, FK to action_items
  linked_filtered_info_id: UUID | null, // decisions_log.linked_filtered_info_id - nullable, FK to filtered_information
  created_at: DateTime         // decisions_log.created_at - NOT NULL, default now()
})

// ============================================
// UPDATE NODE - Maps to public.updates
// ============================================
(:Update {
  id: UUID,                    // updates.id - PRIMARY KEY, default gen_random_uuid()
  title: String,               // updates.title - NOT NULL
  summary: String,             // updates.summary - NOT NULL
  content_type: content_type,  // updates.content_type - NOT NULL, default "document", ENUM
  status: action_status,       // updates.status - NOT NULL, default "pending", ENUM
  source: String | null,       // updates.source - nullable
  source_url: String | null,   // updates.source_url - nullable
  tags: [String] | null,       // updates.tags - nullable, default '{}'
  author_id: UUID | null,      // updates.author_id - nullable, FK to auth.users
  created_at: DateTime,        // updates.created_at - NOT NULL, default now()
  updated_at: DateTime         // updates.updated_at - NOT NULL, default now()
})

// ============================================
// ACTION COMMENT NODE - Maps to public.action_comments
// ============================================
(:ActionComment {
  id: UUID,                    // action_comments.id - PRIMARY KEY, default gen_random_uuid()
  action_item_id: UUID,        // action_comments.action_item_id - NOT NULL, FK to action_items
  user_id: UUID,               // action_comments.user_id - NOT NULL, FK to auth.users
  content: String,             // action_comments.content - NOT NULL
  created_at: DateTime         // action_comments.created_at - NOT NULL, default now()
})

// ============================================
// ACTIVITY LOG NODE - Maps to public.activity_log
// ============================================
(:Activity {
  id: UUID,                    // activity_log.id - PRIMARY KEY, default gen_random_uuid()
  user_id: UUID,               // activity_log.user_id - NOT NULL, FK to auth.users
  action: String,              // activity_log.action - NOT NULL
  target: String,              // activity_log.target - NOT NULL
  target_type: String,         // activity_log.target_type - NOT NULL, default "document"
  created_at: DateTime         // activity_log.created_at - NOT NULL, default now()
})`}</pre>
            </div>
          </div>

          {/* Relationship Types */}
          <div>
            <h4 className="font-semibold mb-3">Relationship Types (Based on Foreign Keys)</h4>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre className="text-muted-foreground">{`// ============================================
// PROFILE & USER ROLE RELATIONSHIPS
// ============================================

(:Profile)-[:HAS_ROLE]->(:UserRole)
  // Link via: profiles.user_id = user_roles.user_id

(:Profile)-[:APPROVED_BY]->(:Profile)
  // Link via: profiles.approved_by -> profiles.user_id


// ============================================
// RAW SUBMISSION RELATIONSHIPS
// ============================================

(:Profile)-[:SUBMITTED]->(:RawSubmission)
  // Link via: raw_submissions.submitted_by -> profiles.user_id


// ============================================
// FILTERED INFORMATION RELATIONSHIPS
// ============================================

(:RawSubmission)-[:PROCESSED_INTO]->(:FilteredInformation)
  // Link via: filtered_information.raw_submission_id -> raw_submissions.id


// ============================================
// ACTION ITEM RELATIONSHIPS
// ============================================

(:RawSubmission)-[:ORIGINATED]->(:ActionItem)
  // Link via: action_items.raw_submission_id -> raw_submissions.id

(:FilteredInformation)-[:GENERATED]->(:ActionItem)
  // Link via: action_items.filtered_info_id -> filtered_information.id

(:Profile)-[:CREATED_ACTION]->(:ActionItem)
  // Link via: action_items.created_by -> profiles.user_id

(:Profile)-[:SUBMITTED_FOR_APPROVAL]->(:ActionItem)
  // Link via: action_items.submitted_by -> profiles.user_id

(:Profile)-[:RESOLVED]->(:ActionItem)
  // Link via: action_items.resolved_by -> profiles.user_id
  // Properties: { resolved_at: DateTime, status: action_status }


// ============================================
// DECISION RELATIONSHIPS
// ============================================

(:Profile)-[:MADE_DECISION]->(:Decision)
  // Link via: decisions_log.decision_maker -> profiles.user_id

(:ActionItem)-[:BECAME]->(:Decision)
  // Link via: decisions_log.linked_action_item_id -> action_items.id

(:FilteredInformation)-[:LED_TO]->(:Decision)
  // Link via: decisions_log.linked_filtered_info_id -> filtered_information.id


// ============================================
// ACTION COMMENT RELATIONSHIPS
// ============================================

(:Profile)-[:COMMENTED]->(:ActionComment)
  // Link via: action_comments.user_id -> profiles.user_id

(:ActionComment)-[:ON]->(:ActionItem)
  // Link via: action_comments.action_item_id -> action_items.id


// ============================================
// UPDATE RELATIONSHIPS
// ============================================

(:Profile)-[:AUTHORED]->(:Update)
  // Link via: updates.author_id -> profiles.user_id


// ============================================
// ACTIVITY RELATIONSHIPS
// ============================================

(:Profile)-[:PERFORMED]->(:Activity)
  // Link via: activity_log.user_id -> profiles.user_id`}</pre>
            </div>
          </div>

          {/* Enum Reference - Exactly from Supabase types.ts */}
          <div>
            <h4 className="font-semibold mb-3">Enums (from Database)</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">action_status</p>
                <code className="text-muted-foreground">"pending" | "approved" | "rejected" | "revision"</code>
                <p className="text-xs text-muted-foreground mt-1">Tables: action_items.status, updates.status</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">action_priority</p>
                <code className="text-muted-foreground">"high" | "medium" | "low"</code>
                <p className="text-xs text-muted-foreground mt-1">Tables: action_items.priority</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">app_role</p>
                <code className="text-muted-foreground">"founder" | "employee"</code>
                <p className="text-xs text-muted-foreground mt-1">Tables: user_roles.role</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">content_type</p>
                <code className="text-muted-foreground">"document" | "audio" | "image" | "meeting"</code>
                <p className="text-xs text-muted-foreground mt-1">Tables: updates.content_type</p>
              </div>
            </div>
          </div>

          {/* String Status Fields with Conventions */}
          <div>
            <h4 className="font-semibold mb-3">String Status Fields (Non-Enum)</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">profiles.approval_status</p>
                <code className="text-muted-foreground">"pending" | "approved" | "rejected"</code>
                <p className="text-xs text-muted-foreground mt-1">Type: text, Default: "pending"</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">raw_submissions.processing_status</p>
                <code className="text-muted-foreground">"pending" | "processing" | "completed" | "failed"</code>
                <p className="text-xs text-muted-foreground mt-1">Type: text, Default: "pending"</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">filtered_information.status</p>
                <code className="text-muted-foreground">"notes_drafted" | "reviewed" | "archived"</code>
                <p className="text-xs text-muted-foreground mt-1">Type: text, Default: "notes_drafted"</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">filtered_information.strategic_priority</p>
                <code className="text-muted-foreground">"critical" | "high" | "medium" | "low" | "informational"</code>
                <p className="text-xs text-muted-foreground mt-1">Type: text, Default: "medium"</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium mb-2">activity_log.target_type</p>
                <code className="text-muted-foreground">"document" | "action_item" | ...</code>
                <p className="text-xs text-muted-foreground mt-1">Type: text, Default: "document"</p>
              </div>
            </div>
          </div>

          {/* Table Summary */}
          <div>
            <h4 className="font-semibold mb-3">Supabase Tables → Neo4j Nodes Mapping</h4>
            <div className="bg-muted rounded-lg p-4 text-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Supabase Table</th>
                    <th className="text-left py-2">Neo4j Node</th>
                    <th className="text-left py-2">Primary Key</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2">profiles</td>
                    <td className="py-2">:Profile</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">user_roles</td>
                    <td className="py-2">:UserRole</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">raw_submissions</td>
                    <td className="py-2">:RawSubmission</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">filtered_information</td>
                    <td className="py-2">:FilteredInformation</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">action_items</td>
                    <td className="py-2">:ActionItem</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">decisions_log</td>
                    <td className="py-2">:Decision</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">updates</td>
                    <td className="py-2">:Update</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">action_comments</td>
                    <td className="py-2">:ActionComment</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                  <tr>
                    <td className="py-2">activity_log</td>
                    <td className="py-2">:Activity</td>
                    <td className="py-2">id (UUID)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
