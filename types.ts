export enum Severity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export enum CaseStatus {
  OPEN = 'Open',
  INVESTIGATING = 'Investigating',
  CONTAINED = 'Contained',
  CLOSED = 'Closed',
}

export interface Alert {
  id: string;
  source: string;
  ts: string;
  rawSeverity: string;
  title: string;
  description: string;
  rawEvent: Record<string, any>;
  aiTriage?: {
    summary: string;
    severity: Severity;
    rationale: string;
    iocs: Array<{ type: string; value: string }>;
    recommendedChecks: string[];
  };
}

export interface Case {
  id: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  linkedAlertIds: string[];
  summary: string;
  timeline: Array<{ ts: string; description: string; type: 'alert' | 'note' | 'ai' }>;
  iocs: Array<{ type: string; value: string; count: number }>;
  hypothesis?: string;
  confidence?: number; // 0-100
  phase?: string; // Recon, Weaponization, Delivery, etc.
  exampleQueries?: string[];
  responsePlan?: ResponsePlan;
}

export interface ResponsePlan {
  actions: Action[];
  rollbackSteps: string[];
}

export interface Action {
  id: string;
  type: string;
  label: string;
  status: 'proposed' | 'approved' | 'executed' | 'failed';
  impactNote: string;
}

export interface AuditLogEntry {
  id: string;
  ts: string;
  actor: 'AI' | 'Human' | 'System';
  kind: 'TRIAGE' | 'INVESTIGATION' | 'ACTION_APPROVAL' | 'ACTION_EXECUTION' | 'REPORT_GEN';
  caseId?: string;
  alertId?: string;
  details: string;
}