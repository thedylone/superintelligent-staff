export type ActionStatus = "pending" | "approved" | "rejected" | "revision";
export type ActionPriority = "high" | "medium" | "low";

export interface ActionItem {
  id: string;
  title: string;
  summary: string;
  details?: string | null;
  status: ActionStatus;
  priority: ActionPriority;
  created_at: string;
  updated_at?: string | null;
  deadline?: string | null;
  importance?: number | null;
  source?: string | null;
  revision_notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export type ActionItemUpdate = Partial<ActionItem>;

export type ApprovalStatus = "pending" | "approved" | "rejected" | null;

export interface Profile {
  id?: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  department?: string | null;
  role_title?: string | null;
  approval_status?: ApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type ProfileUpdate = Partial<Profile>;
