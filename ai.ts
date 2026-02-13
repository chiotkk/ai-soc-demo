import { GoogleGenAI } from "@google/genai";
import { Alert, Case, Severity, Action } from './types';
import { store } from './store';

// We use the store to log audit entries directly from the service
const LOG_ACTOR = 'AI';

// --- STUBS ---

const STUB_TRIAGE_RESPONSES: Record<string, any> = {
  'AL-1001': {
    summary: "Detected a classic SQL Injection attempt targeting the search endpoint. The payload uses a tautology (' OR 1=1) to bypass authentication or retrieve unauthorized data.",
    severity: Severity.HIGH,
    rationale: "High confidence pattern match for SQLi. The payload is explicitly malicious and targeted at a database interaction point.",
    iocs: [{ type: 'IP', value: '192.168.45.12' }, { type: 'Path', value: '/search' }],
    recommendedChecks: [
      "Check database logs for syntax errors around the timestamp.",
      "Verify if WAF blocked the request (usually 403 status).",
      "Correlate IP with other recent suspicious activity."
    ]
  },
  'AL-1002': {
    summary: "Significant Credential Stuffing attack observed. Single IP attempting to brute force multiple high-value accounts (admin, root) with high frequency.",
    severity: Severity.CRITICAL,
    rationale: "Volume of requests (450 in 60s) exceeds human capability. Targeting privileged accounts poses immediate takeover risk.",
    iocs: [{ type: 'IP', value: '45.33.22.11' }, { type: 'UserAgent', value: 'Hydra/9.1' }],
    recommendedChecks: [
      "Check for any successful logins (HTTP 200) from this IP.",
      "Verify global account lockouts for targeted users.",
      "Inspect firewall logs for other ports accessed by this IP."
    ]
  },
  'AL-1003': {
    summary: "Automated scraping detected on product pages. Rate of requests indicates non-human behavior, likely a price scraper or content aggregator.",
    severity: Severity.MEDIUM,
    rationale: "While not an exploit, this consumes resources and violates ToS. Low immediate security risk to data integrity.",
    iocs: [{ type: 'IP', value: '10.0.5.55' }, { type: 'Pattern', value: '/product/*' }],
    recommendedChecks: [
      "Check User-Agent string distribution.",
      "Verify impact on server load/latency.",
      "Check if IP belongs to a known cloud provider (AWS, GCP) or residential proxy."
    ]
  }
};

const STUB_INVESTIGATION: Record<string, any> = {
  'SQLi': {
    hypothesis: "The attacker is probing for SQL injection vulnerabilities in the `q` parameter of the search function. They are likely using an automated tool (like SQLMap) given the standard payload syntax.",
    confidence: 95,
    phase: "Delivery / Exploitation",
    exampleQueries: [
      `source="waf" | where ip == "192.168.45.12" | stats count by status_code`,
      `source="db_audit" | where query contains "OR 1=1"`,
      `source="access_log" | where uri matches "/search.*" AND status == 200`
    ]
  },
  'CredStuff': {
    hypothesis: "This is a distributed brute-force attack. The attacker possesses a list of valid usernames and is cycling through common passwords. The source IP is likely a compromised proxy.",
    confidence: 98,
    phase: "Credential Access",
    exampleQueries: [
      `source="auth_logs" | where ip == "45.33.22.11" | stats count by result`,
      `source="auth_logs" | where result == "success" AND ip == "45.33.22.11"`,
      `source="firewall" | where src_ip == "45.33.22.11"`
    ]
  }
};

const STUB_RESPONSE_PLAN: Record<string, any> = {
  'SQLi': {
    actions: [
      { id: 'act_1', type: 'block_ip', label: 'Block IP 192.168.45.12 on Edge Firewall', status: 'proposed', impactNote: 'Will block all traffic from this IP. Low collateral risk if IP is non-residential.' },
      { id: 'act_2', type: 'patch_waf', label: 'Apply WAF Virtual Patch for CVE-2024-XYZ', status: 'proposed', impactNote: 'Prevents this specific SQLi pattern globally.' }
    ],
    rollbackSteps: ["Remove IP from Edge Deny List", "Disable WAF Rule 90021"]
  },
  'CredStuff': {
    actions: [
      { id: 'act_1', type: 'block_ip', label: 'Block IP 45.33.22.11', status: 'proposed', impactNote: 'Immediate mitigation.' },
      { id: 'act_2', type: 'reset_creds', label: 'Force Password Reset for targeted Admins', status: 'proposed', impactNote: 'High user friction, but necessary if any success suspected.' }
    ],
    rollbackSteps: ["Unban IP", "Unlock accounts manually"]
  }
};

// --- HELPER FUNCTIONS ---

const getApiKey = () => process.env.API_KEY || '';

export const triageAlert = async (alert: Alert): Promise<NonNullable<Alert['aiTriage']>> => {
  store.addAuditLog(LOG_ACTOR, 'TRIAGE', `Analyzing alert ${alert.id}...`, undefined, alert.id);
  
  const apiKey = getApiKey();
  
  if (!apiKey) {
    // Stub Fallback
    await new Promise(r => setTimeout(r, 1500)); // Simulate think time
    const stub = STUB_TRIAGE_RESPONSES[alert.id] || STUB_TRIAGE_RESPONSES['AL-1003'];
    store.addAuditLog(LOG_ACTOR, 'TRIAGE', `Completed triage for ${alert.id}`, undefined, alert.id);
    return stub;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this security alert and return a JSON object with keys: summary (string), severity (Low|Medium|High|Critical), rationale (string), iocs (array of objects {type, value}), recommendedChecks (array of strings). 
      
      Alert Data: ${JSON.stringify(alert)}`,
       config: { responseMimeType: 'application/json' }
    });
    
    store.addAuditLog(LOG_ACTOR, 'TRIAGE', `Completed triage for ${alert.id}`, undefined, alert.id);
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("AI Error", e);
    return STUB_TRIAGE_RESPONSES['AL-1001']; // Fail safe
  }
};

export const investigateCase = async (kase: Case, alerts: Alert[]) => {
  store.addAuditLog(LOG_ACTOR, 'INVESTIGATION', `Generating investigation hypothesis for Case ${kase.id}`, kase.id);

  const apiKey = getApiKey();
  
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 2000));
    // Determine stub type based on first alert title
    const type = alerts[0]?.title.includes('SQL') ? 'SQLi' : 'CredStuff';
    const stub = STUB_INVESTIGATION[type] || STUB_INVESTIGATION['CredStuff'];
    
    // Update store
    store.updateCase(kase.id, {
      hypothesis: stub.hypothesis,
      confidence: stub.confidence,
      phase: stub.phase,
      exampleQueries: stub.exampleQueries,
      timeline: [...kase.timeline, { ts: new Date().toISOString(), description: `AI Investigation: ${stub.hypothesis}`, type: 'ai' }]
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are a Tier 3 Security Analyst. Investigate this case based on the linked alerts. 
      Return JSON: { hypothesis, confidence (0-100), phase (Mitre ATT&CK), exampleQueries (array of strings) }.
      
      Alerts: ${JSON.stringify(alerts)}`,
      config: { responseMimeType: 'application/json' }
    });
    
    const result = JSON.parse(response.text || '{}');
    store.updateCase(kase.id, {
      ...result,
      timeline: [...kase.timeline, { ts: new Date().toISOString(), description: `AI Investigation: ${result.hypothesis}`, type: 'ai' }]
    });
  } catch (e) {
     console.error(e);
  }
};

export const draftResponsePlan = async (kase: Case, alerts: Alert[]) => {
  store.addAuditLog(LOG_ACTOR, 'ACTION_APPROVAL', `Drafting response plan for Case ${kase.id}`, kase.id);

  const apiKey = getApiKey();
  
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 1800));
    const type = alerts[0]?.title.includes('SQL') ? 'SQLi' : 'CredStuff';
    const stub = STUB_RESPONSE_PLAN[type] || STUB_RESPONSE_PLAN['CredStuff'];
    
    store.updateCase(kase.id, {
      responsePlan: stub
    });
    return;
  }
  
  // Real implementation would go here similar to above
  // For brevity/reliability in demo, strictly using stub structure for complex nested objects in a demo env if API key fails
  // But providing the call structure:
  try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Propose an incident response plan. Return JSON { actions: [{id, type, label, status: 'proposed', impactNote}], rollbackSteps: [string] }.
        Case: ${JSON.stringify(kase)}`,
        config: { responseMimeType: 'application/json' }
      });
      const result = JSON.parse(response.text || '{}');
      store.updateCase(kase.id, { responsePlan: result });
  } catch(e) {
      console.error(e);
  }
};

export const generateIncidentReport = async (kase: Case): Promise<string> => {
    store.addAuditLog(LOG_ACTOR, 'REPORT_GEN', `Generating final report for Case ${kase.id}`, kase.id);
    await new Promise(r => setTimeout(r, 1000));
    
    return `# Incident Report: ${kase.id}
    
## Executive Summary
${kase.summary}

**Status:** ${kase.status}
**Confidence:** ${kase.confidence || 'N/A'}%
**Phase:** ${kase.phase || 'N/A'}

## Investigation Timeline
${kase.timeline.map(t => `- ${new Date(t.ts).toLocaleTimeString()} - ${t.description}`).join('\n')}

## Indicators of Compromise
${kase.iocs.map(i => `- ${i.type}: ${i.value} (${i.count} hits)`).join('\n')}

## Actions Taken
${kase.responsePlan?.actions.filter(a => a.status === 'executed').map(a => `- [x] ${a.label}`).join('\n') || 'No actions executed yet.'}

## Recommended Remediations
1. Rotate compromised credentials.
2. Tune WAF ruleset 90021.
3. Conduct user awareness training.
`;
}