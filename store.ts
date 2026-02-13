import { Alert, AuditLogEntry, Case, CaseStatus, Severity } from './types';

// --- SEED DATA ---

const SEED_ALERTS: Alert[] = [
  {
    id: 'AL-1001',
    source: 'WAF-Edge',
    ts: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    rawSeverity: 'High',
    title: 'SQL Injection Pattern Detected',
    description: 'Multiple requests containing SQL syntax characters in query parameters on /search endpoint.',
    rawEvent: {
      ip: '192.168.45.12',
      method: 'GET',
      path: '/search?q=%27%20OR%201%3D1--',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      geo: 'CN',
      payload_b64: 'JyBPUiAxPTEtLQ=='
    }
  },
  {
    id: 'AL-1002',
    source: 'Auth-Service',
    ts: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    rawSeverity: 'Critical',
    title: 'Credential Stuffing Anomaly',
    description: 'High volume of failed login attempts from single IP against multiple usernames.',
    rawEvent: {
      ip: '45.33.22.11',
      endpoint: '/api/v1/login',
      failure_count: 450,
      window_seconds: 60,
      usernames_sample: ['admin', 'root', 'support', 'test']
    }
  },
  {
    id: 'AL-1003',
    source: 'Rate-Limiter',
    ts: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    rawSeverity: 'Medium',
    title: 'Bot Scraping Spike',
    description: 'Pattern matches known scraper bot behavior on product catalog pages.',
    rawEvent: {
      ip: '10.0.5.55',
      path_pattern: '/product/*',
      rpm: 120,
      threshold: 60,
      bot_score: 0.85
    }
  }
];

// --- STORE IMPLEMENTATION ---

class MockStore {
  alerts: Alert[] = [...SEED_ALERTS];
  cases: Case[] = [];
  auditLogs: AuditLogEntry[] = [];
  listeners: (() => void)[] = [];

  constructor() {
    this.addAuditLog('System', 'REPORT_GEN', 'System initialized with seed data', undefined, undefined);
  }

  // Subscribe to changes (simple observer)
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l());
  }

  getAlerts() {
    return this.alerts;
  }

  getAlert(id: string) {
    return this.alerts.find(a => a.id === id);
  }

  addAlert(alert: Alert) {
    this.alerts = [alert, ...this.alerts];
    this.notify();
  }

  updateAlert(id: string, updates: Partial<Alert>) {
    this.alerts = this.alerts.map(a => a.id === id ? { ...a, ...updates } : a);
    this.notify();
  }

  getCases() {
    return this.cases;
  }

  getCase(id: string) {
    return this.cases.find(c => c.id === id);
  }

  createCase(fromAlert: Alert) {
    // Check if case already exists for this alert to prevent duplicates
    const existingCase = this.cases.find(c => c.linkedAlertIds.includes(fromAlert.id));
    if (existingCase) return existingCase;

    const newCase: Case = {
      id: `CASE-${Date.now().toString().slice(-4)}`,
      status: CaseStatus.OPEN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedAlertIds: [fromAlert.id],
      summary: `Investigation started from alert: ${fromAlert.title}`,
      timeline: [
        { ts: fromAlert.ts, description: `Alert Triggered: ${fromAlert.title}`, type: 'alert' },
        { ts: new Date().toISOString(), description: 'Case created by Human Analyst', type: 'note' }
      ],
      iocs: fromAlert.aiTriage?.iocs.map(i => ({ ...i, count: 1 })) || [],
    };
    this.cases.push(newCase);
    this.addAuditLog('Human', 'INVESTIGATION', `Created case ${newCase.id} from alert ${fromAlert.id}`, newCase.id, fromAlert.id);
    this.notify();
    return newCase;
  }

  linkAlertToCase(caseId: string, alert: Alert) {
    const kaseIndex = this.cases.findIndex(c => c.id === caseId);
    if (kaseIndex === -1) return;
    
    const kase = this.cases[kaseIndex];
    if (kase.linkedAlertIds.includes(alert.id)) return;

    // Merge IOCs
    const newIocs = [...kase.iocs];
    alert.aiTriage?.iocs.forEach(alertIoc => {
        const existing = newIocs.find(i => i.value === alertIoc.value && i.type === alertIoc.type);
        if (existing) {
            existing.count++;
        } else {
            newIocs.push({ ...alertIoc, count: 1 });
        }
    });

    const updatedCase: Case = {
        ...kase,
        linkedAlertIds: [...kase.linkedAlertIds, alert.id],
        iocs: newIocs,
        timeline: [
            ...kase.timeline,
            { ts: alert.ts, description: `Linked Alert: ${alert.title}`, type: 'alert' },
            { ts: new Date().toISOString(), description: `Linked alert ${alert.id} to case`, type: 'note' }
        ],
        updatedAt: new Date().toISOString()
    };
    
    this.cases = [
        ...this.cases.slice(0, kaseIndex),
        updatedCase,
        ...this.cases.slice(kaseIndex + 1)
    ];

    this.addAuditLog('Human', 'INVESTIGATION', `Linked alert ${alert.id} to case ${caseId}`, caseId, alert.id);
    this.notify();
  }

  updateCase(id: string, updates: Partial<Case>) {
    this.cases = this.cases.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
    this.notify();
  }

  addAuditLog(actor: 'AI' | 'Human' | 'System', kind: AuditLogEntry['kind'], details: string, caseId?: string, alertId?: string) {
    const log: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ts: new Date().toISOString(),
      actor,
      kind,
      details,
      caseId,
      alertId
    };
    this.auditLogs.unshift(log); // Prepend
    this.notify();
  }

  getAuditLogs(caseId?: string) {
    if (caseId) return this.auditLogs.filter(l => l.caseId === caseId);
    return this.auditLogs;
  }
}

export const store = new MockStore();