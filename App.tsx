import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Activity, 
  FileText, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  Terminal,
  Clock,
  ArrowLeft,
  ChevronRight,
  Briefcase,
  FolderOpen,
  Zap,
  LayoutDashboard,
  Link
} from 'lucide-react';
import { store } from './store';
import { triageAlert, investigateCase, draftResponsePlan, generateIncidentReport } from './ai';
import { Alert, Case, Action, Severity, CaseStatus } from './types';

// --- HELPERS ---

const generateMockAlert = (): Alert => {
  const types = [
    { title: 'Suspicious PowerShell Execution', desc: 'Encoded command detected on endpoint.', severity: Severity.HIGH, source: 'EDR' },
    { title: 'Anomalous Data Egress', desc: 'Large file transfer to unknown IP.', severity: Severity.MEDIUM, source: 'Network' },
    { title: 'New Admin Account Created', desc: 'User created outside change window.', severity: Severity.CRITICAL, source: 'IAM' },
    { title: 'Port Scan Detected', desc: 'Horizontal scan detected from internal host.', severity: Severity.LOW, source: 'Firewall' },
    { title: 'Impossible Travel', desc: 'Login from London and Tokyo within 5 minutes.', severity: Severity.HIGH, source: 'Auth' },
  ];
  const t = types[Math.floor(Math.random() * types.length)];
  const idSuffix = Math.floor(Math.random() * 9000) + 1000;
  return {
    id: `AL-${idSuffix}`,
    ts: new Date().toISOString(),
    source: t.source,
    rawSeverity: t.severity,
    title: t.title,
    description: t.desc,
    rawEvent: { simulated: true, id: idSuffix }
  };
};

// --- COMPONENTS ---

const Badge = ({ children, color }: { children?: React.ReactNode, color: 'red' | 'yellow' | 'green' | 'blue' | 'gray' }) => {
  const colors = {
    red: 'bg-red-900/50 text-red-200 border-red-800',
    yellow: 'bg-yellow-900/50 text-yellow-200 border-yellow-800',
    green: 'bg-emerald-900/50 text-emerald-200 border-emerald-800',
    blue: 'bg-blue-900/50 text-blue-200 border-blue-800',
    gray: 'bg-slate-700 text-slate-300 border-slate-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

const Button = ({ onClick, children, variant = 'primary', icon: Icon, disabled = false, className = '' }: any) => {
  const base = "flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100",
    outline: "border border-slate-600 hover:bg-slate-800 text-slate-300",
    ghost: "hover:bg-slate-800 text-slate-400 hover:text-slate-100"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

// --- VIEWS ---

const AlertsView = ({ alerts, cases }: { alerts: Alert[], cases: Case[] }) => {
  const [loadingTriage, setLoadingTriage] = useState<string | null>(null);
  const [linkingAlertId, setLinkingAlertId] = useState<string | null>(null);

  const openCases = cases.filter(c => c.status !== CaseStatus.CLOSED);

  const handleTriage = async (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation();
    setLoadingTriage(alert.id);
    const analysis = await triageAlert(alert);
    store.updateAlert(alert.id, { aiTriage: analysis });
    setLoadingTriage(null);
  };

  const handleCreateCase = (e: React.MouseEvent, alert: Alert) => {
    e.stopPropagation();
    store.createCase(alert);
  };

  const handleLinkToCase = (e: React.MouseEvent, caseId: string, alert: Alert) => {
    e.stopPropagation();
    store.linkAlertToCase(caseId, alert);
    setLinkingAlertId(null);
  };

  const handleSimulate = () => {
    store.addAlert(generateMockAlert());
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="text-blue-500" /> Incoming Alerts
        </h2>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-800 rounded-lg bg-slate-900/30">
          <div className="p-4 bg-slate-800 rounded-full mb-4 opacity-50">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h3 className="text-slate-300 font-medium">All Clear</h3>
          <p className="text-slate-500 text-sm mt-1">No unassigned alerts in queue.</p>
          <button onClick={handleSimulate} className="mt-4 text-blue-400 hover:text-blue-300 text-sm hover:underline">
            Trigger simulation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div 
              key={alert.id} 
              className="relative bg-slate-900 border border-slate-800 hover:border-blue-500/30 rounded-lg p-0 transition-all animate-in slide-in-from-top-2 duration-300 overflow-hidden"
            >
              {/* Severity Stripe */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                alert.rawSeverity === 'Critical' ? 'bg-red-500' : 
                alert.rawSeverity === 'High' ? 'bg-orange-500' : 
                alert.rawSeverity === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />

              <div className="p-4 pl-5 flex justify-between items-start gap-6">
                <div className="flex-1">
                   {/* Header: Title + ID + Severity Badge */}
                   <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-slate-200 font-medium text-base">{alert.title}</h3>
                      <span className="text-xs text-slate-500 font-mono bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50">{alert.id}</span>
                      <Badge color={alert.rawSeverity === 'Critical' ? 'red' : alert.rawSeverity === 'High' ? 'yellow' : alert.rawSeverity === 'Medium' ? 'yellow' : 'blue'}>{alert.rawSeverity}</Badge>
                   </div>
                   
                   {/* Description */}
                   <p className="text-sm text-slate-400 mb-3 leading-relaxed max-w-3xl">{alert.description}</p>
                   
                   {/* Metadata */}
                   <div className="flex gap-4 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5"><Terminal size={12} className="text-slate-600"/> {alert.source}</span>
                      <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-600"/> {new Date(alert.ts).toLocaleTimeString()}</span>
                   </div>
                </div>

                {/* Actions Column */}
                <div className="flex flex-col items-end gap-2 min-w-[140px]">
                   {!alert.aiTriage ? (
                      <button
                        onClick={(e) => handleTriage(e, alert)}
                        disabled={loadingTriage === alert.id}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-md shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                         {loadingTriage === alert.id ? (
                            <>Analyzing...</>
                         ) : (
                            <><Zap size={14} className="fill-current" /> AI Analyze</>
                         )}
                      </button>
                   ) : (
                      /* Triaged Actions */
                       linkingAlertId === alert.id ? (
                         // Linking UI
                         <div className="flex flex-col gap-2 items-end animate-in fade-in slide-in-from-right-2 bg-slate-950 p-3 rounded-lg border border-slate-800 z-10 w-full shadow-xl">
                             <span className="text-xs text-slate-400 font-medium w-full text-left">Select Case:</span>
                             <select 
                                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 w-full"
                                onChange={(e) => {
                                    if (e.target.value) handleLinkToCase(e as any, e.target.value, alert);
                                }}
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="" disabled>Choose...</option>
                                {openCases.map(c => (
                                    <option key={c.id} value={c.id}>{c.id}</option>
                                ))}
                            </select>
                            <button 
                               onClick={(e:any) => { e.stopPropagation(); setLinkingAlertId(null); }} 
                               className="text-xs text-slate-500 hover:text-slate-300 hover:underline w-full text-right"
                            >
                              Cancel
                            </button>
                         </div>
                       ) : (
                         <div className="flex flex-col gap-2 w-full">
                            <Button variant="primary" className="w-full justify-center" onClick={(e: any) => handleCreateCase(e, alert)}>
                              Promote
                            </Button>
                            <Button 
                              variant="outline" 
                              icon={Link} 
                              className="w-full justify-center"
                              onClick={(e: any) => { e.stopPropagation(); setLinkingAlertId(alert.id); }} 
                              disabled={openCases.length === 0}
                            >
                              Link
                            </Button>
                         </div>
                       )
                   )}
                </div>
              </div>

              {/* AI Analysis Result */}
              {alert.aiTriage && (
                <div className="border-t border-slate-800/50 bg-slate-900/30 p-4 pl-5 animate-in fade-in">
                  <div className="flex items-start gap-4">
                    <div className="p-1.5 bg-purple-500/10 rounded-md border border-purple-500/20 mt-0.5">
                      <Cpu size={16} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-purple-200">AI Analysis</span>
                        <Badge color={alert.aiTriage.severity === Severity.CRITICAL ? 'red' : alert.aiTriage.severity === Severity.HIGH ? 'yellow' : 'blue'}>
                          {alert.aiTriage.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300 mb-4">{alert.aiTriage.summary}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
                          <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Extracted IOCs</span>
                          <div className="flex flex-wrap gap-2">
                            {alert.aiTriage.iocs.map((ioc, i) => (
                              <span key={i} className="text-xs font-mono bg-slate-900 border border-slate-800 px-2 py-1 rounded text-blue-300 flex items-center gap-1.5">
                                <span className="opacity-50">{ioc.type}:</span> {ioc.value}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50">
                           <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Recommended Checks</span>
                           <ul className="space-y-1">
                             {alert.aiTriage.recommendedChecks.slice(0, 3).map((c, i) => (
                               <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                                 <span className="mt-1 w-1 h-1 rounded-full bg-slate-600" />
                                 {c}
                               </li>
                             ))}
                           </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CasesListView = ({ cases, onSelect }: { cases: Case[], onSelect: (id: string) => void }) => {
  return (
    <div className="space-y-4">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Briefcase className="text-blue-500" /> Active Investigations
        </h2>
        <span className="text-xs text-slate-400">Count: {cases.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cases.length === 0 ? (
           <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded">
              No active cases. Triage alerts to create cases.
           </div>
        ) : (
          cases.map(c => (
            <div 
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-4 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${c.status === 'Open' ? 'bg-green-500' : 'bg-slate-500'}`} />
                    <span className="font-mono text-blue-400 font-medium">{c.id}</span>
                    <Badge color="gray">{c.status}</Badge>
                 </div>
                 <div className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <h3 className="text-slate-200 font-medium mb-1 truncate">{c.summary}</h3>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                 <span className="flex items-center gap-1"><AlertTriangle size={12} /> {c.linkedAlertIds.length} Alerts</span>
                 <span className="flex items-center gap-1"><Activity size={12} /> {c.iocs.length} IOCs</span>
                 {c.confidence && (
                    <span className={`px-1.5 py-0.5 rounded ${c.confidence > 80 ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                       Risk: {c.confidence}%
                    </span>
                 )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const CaseDetailView = ({ caseId, onBack }: { caseId: string, onBack: () => void }) => {
  const [activeCase, setActiveCase] = useState<Case | undefined>();
  const [activeTab, setActiveTab] = useState<'investigation' | 'response' | 'audit'>('investigation');
  const [processing, setProcessing] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState('');

  // Fetch case data
  useEffect(() => {
    setActiveCase(store.getCase(caseId));
    return store.subscribe(() => setActiveCase(store.getCase(caseId)));
  }, [caseId]);

  const handleInvestigate = async () => {
    if (!activeCase) return;
    setProcessing(true);
    const alerts = store.getAlerts().filter(a => activeCase.linkedAlertIds.includes(a.id));
    await investigateCase(activeCase, alerts);
    setProcessing(false);
  };

  const handleDraftPlan = async () => {
    if (!activeCase) return;
    setProcessing(true);
    const alerts = store.getAlerts().filter(a => activeCase.linkedAlertIds.includes(a.id));
    await draftResponsePlan(activeCase, alerts);
    setActiveTab('response');
    setProcessing(false);
  };

  const handleExecuteAction = (actionId: string) => {
    if (!activeCase) return;
    const newActions = activeCase.responsePlan?.actions.map(a => 
      a.id === actionId ? { ...a, status: 'executed' as const } : a
    );
    if (newActions) {
      store.updateCase(caseId, { responsePlan: { ...activeCase.responsePlan!, actions: newActions } });
      store.addAuditLog('Human', 'ACTION_EXECUTION', `Executed action ${actionId}`, caseId);
    }
  };

  const handleGenReport = async () => {
    if (!activeCase) return;
    const report = await generateIncidentReport(activeCase);
    setReportContent(report);
    setReportModalOpen(true);
  };

  if (!activeCase) return <div>Loading...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} icon={ArrowLeft}>Back to Cases</Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{activeCase.id}</h2>
              <Badge color="blue">{activeCase.status}</Badge>
              {activeCase.confidence && (
                <Badge color={activeCase.confidence > 80 ? 'red' : 'yellow'}>
                  Risk Confidence: {activeCase.confidence}%
                </Badge>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">{activeCase.summary}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" icon={FileText} onClick={handleGenReport}>Report</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-800 mb-6">
        {['investigation', 'response', 'audit'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${
              activeTab === tab 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto pr-2">
        {activeTab === 'investigation' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              {/* Hypothesis Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Search size={18} className="text-purple-400" /> Investigation Analysis
                  </h3>
                  <Button 
                    variant="primary" 
                    icon={Cpu} 
                    onClick={handleInvestigate} 
                    disabled={processing}
                  >
                    {processing ? 'Thinking...' : 'AI Investigate'}
                  </Button>
                </div>
                
                {activeCase.hypothesis ? (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="p-4 bg-slate-950/50 rounded border border-slate-800">
                      <p className="text-slate-300 leading-relaxed">{activeCase.hypothesis}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase">Attack Phase</span>
                        <div className="mt-1 text-slate-200 font-mono text-sm">{activeCase.phase}</div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase">Suggested Queries</span>
                         <div className="mt-1 space-y-1">
                           {activeCase.exampleQueries?.map((q, i) => (
                             <div key={i} className="text-xs font-mono text-blue-300 bg-slate-950 p-1 rounded truncate">
                               {q}
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-500 bg-slate-950/30 rounded border border-dashed border-slate-800">
                    Run AI investigation to generate hypothesis and queries.
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Clock size={18} /> Timeline
                </h3>
                <div className="border-l-2 border-slate-800 pl-4 space-y-6">
                  {activeCase.timeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        event.type === 'alert' ? 'bg-red-500' : event.type === 'ai' ? 'bg-purple-500' : 'bg-slate-500'
                      }`} />
                      <span className="text-xs text-slate-500 block mb-1">{new Date(event.ts).toLocaleTimeString()}</span>
                      <p className="text-sm text-slate-300">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar IOCs */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Activity size={18} /> IOCs ({activeCase.iocs.length})
                </h3>
                <div className="space-y-2">
                  {activeCase.iocs.map((ioc, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-950 p-2 rounded text-sm">
                      <div className="overflow-hidden">
                        <span className="text-xs text-slate-500 block uppercase">{ioc.type}</span>
                        <span className="font-mono text-slate-300 truncate block">{ioc.value}</span>
                      </div>
                      <Badge color="gray">{ioc.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              {!activeCase.responsePlan && (
                 <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-center">
                    <p className="text-sm text-slate-400 mb-3">Investigation complete?</p>
                    <Button variant="primary" className="w-full justify-center" onClick={handleDraftPlan}>Draft Response</Button>
                 </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'response' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-semibold text-slate-100">Recommended Response Plan</h3>
               {!activeCase.responsePlan && (
                 <Button variant="primary" icon={Cpu} onClick={handleDraftPlan} disabled={processing}>
                   {processing ? 'Drafting...' : 'Generate Plan'}
                 </Button>
               )}
            </div>

            {activeCase.responsePlan ? (
              <>
                <div className="space-y-3">
                  {activeCase.responsePlan.actions.map((action) => (
                    <div key={action.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${action.status === 'executed' ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                          {action.status === 'executed' ? <CheckCircle2 size={20} /> : <Terminal size={20} />}
                        </div>
                        <div>
                          <h4 className="text-slate-200 font-medium">{action.label}</h4>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <AlertTriangle size={12} className="text-yellow-600" /> Impact: {action.impactNote}
                          </p>
                        </div>
                      </div>
                      {action.status === 'proposed' && (
                        <Button variant="primary" onClick={() => handleExecuteAction(action.id)}>Approve & Execute</Button>
                      )}
                      {action.status === 'executed' && (
                         <Badge color="green">Executed</Badge>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="bg-slate-900/50 border border-slate-800 rounded p-4 mt-6">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase mb-2">Rollback Strategy</h4>
                  <ul className="list-disc list-inside text-sm text-slate-500">
                    {activeCase.responsePlan.rollbackSteps.map((step, i) => <li key={i}>{step}</li>)}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-lg text-slate-500">
                Generate a response plan to see recommended actions.
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="max-w-4xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-800">
                  <th className="py-3 px-2">Time</th>
                  <th className="py-3 px-2">Actor</th>
                  <th className="py-3 px-2">Action</th>
                  <th className="py-3 px-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {store.getAuditLogs(caseId).map(log => (
                  <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                    <td className="py-3 px-2 text-sm text-slate-400 font-mono">
                       {new Date(log.ts).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-2">
                       <Badge color={log.actor === 'AI' ? 'blue' : 'gray'}>{log.actor}</Badge>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-300 font-medium">{log.kind}</td>
                    <td className="py-3 px-2 text-sm text-slate-400">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg shadow-2xl">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white">Generated Incident Report</h3>
                 <button onClick={() => setReportModalOpen(false)}><XCircle className="text-slate-400 hover:text-white" /></button>
              </div>
              <div className="p-6 overflow-auto bg-slate-950 font-mono text-sm text-slate-300 whitespace-pre-wrap">
                 {reportContent}
              </div>
              <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                 <Button variant="secondary" onClick={() => setReportModalOpen(false)}>Close</Button>
                 <Button variant="primary" onClick={() => window.print()}>Print / Save PDF</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN LAYOUT & ROUTER ---

export default function App() {
  const [view, setView] = useState<'alerts' | 'cases' | 'case'>('alerts');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cases, setCases] = useState<Case[]>([]);

  useEffect(() => {
    const sync = () => {
      setAlerts(store.getAlerts());
      setCases(store.getCases());
    };
    sync();
    return store.subscribe(sync);
  }, []);

  // Filter alerts that are not linked to any case (Inbox Zero logic)
  const linkedAlertIds = new Set(cases.flatMap(c => c.linkedAlertIds));
  const unassignedAlerts = alerts.filter(a => !linkedAlertIds.has(a.id));

  const navigateToCase = (id: string) => {
    setSelectedCaseId(id);
    setView('case');
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-blue-500 font-bold text-xl tracking-tighter">
            <ShieldAlert fill="currentColor" />
            <span>SENTINEL</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest pl-8">AI-Native SOC</div>
        </div>
        
        <nav className="flex-1 p-4 space-y-6">
          {/* Alerts Section */}
          <div>
            <div className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Detection</div>
            <button 
              onClick={() => setView('alerts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium transition-colors ${view === 'alerts' ? 'bg-blue-900/30 text-blue-200' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span className="flex items-center gap-3"><AlertTriangle size={18} /> Alerts</span>
              {unassignedAlerts.length > 0 && <Badge color="red">{unassignedAlerts.length}</Badge>}
            </button>
          </div>

          {/* Cases Section */}
          <div>
            <div className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Response</div>
            <button 
              onClick={() => setView('cases')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium transition-colors ${view === 'cases' || view === 'case' ? 'bg-blue-900/30 text-blue-200' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <span className="flex items-center gap-3"><Briefcase size={18} /> Cases</span>
              <Badge color="gray">{cases.length}</Badge>
            </button>
            
            {/* Quick Access List when in Case mode */}
            {(view === 'cases' || view === 'case') && (
              <div className="mt-2 ml-4 space-y-1 border-l border-slate-800 pl-3">
                 {cases.map(c => (
                   <button
                     key={c.id}
                     onClick={() => navigateToCase(c.id)}
                     className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${selectedCaseId === c.id && view === 'case' ? 'text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'Open' ? 'bg-green-500' : 'bg-slate-600'}`} />
                     <span className="truncate">{c.id}</span>
                   </button>
                 ))}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">AI</div>
             <div className="text-sm">
                <div className="text-white">Analyst_Bot</div>
                <div className="text-xs text-green-400 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Online</div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {view === 'alerts' && <AlertsView alerts={unassignedAlerts} cases={cases} />}
            {view === 'cases' && <CasesListView cases={cases} onSelect={navigateToCase} />}
            {view === 'case' && selectedCaseId && <CaseDetailView caseId={selectedCaseId} onBack={() => setView('cases')} />}
          </div>
        </div>
      </main>
    </div>
  );
}