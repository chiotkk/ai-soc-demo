import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { store } from './store';
import { triageAlert, investigateCase, draftResponsePlan, generateIncidentReport } from './ai';
import { Alert, Case, Action, Severity } from './types';

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

const AlertsView = ({ onSelectAlert }: { onSelectAlert: (id: string) => void }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingTriage, setLoadingTriage] = useState<string | null>(null);

  useEffect(() => {
    setAlerts(store.getAlerts());
    return store.subscribe(() => setAlerts(store.getAlerts()));
  }, []);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="text-blue-500" /> Security Alerts
        </h2>
        <span className="text-xs text-slate-400">Total: {alerts.length}</span>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            className="group bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-lg p-4 cursor-pointer transition-all"
            onClick={() => onSelectAlert(alert.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full ${alert.rawSeverity === 'Critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-slate-200 font-medium">{alert.title}</h3>
                    <span className="text-xs text-slate-500 font-mono">{alert.id}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{alert.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>Source: {alert.source}</span>
                    <span>{new Date(alert.ts).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!alert.aiTriage ? (
                  <Button 
                    variant="primary" 
                    icon={Cpu} 
                    onClick={(e: any) => handleTriage(e, alert)}
                    disabled={loadingTriage === alert.id}
                  >
                    {loadingTriage === alert.id ? 'Analyzing...' : 'AI Triage'}
                  </Button>
                ) : (
                  <Button variant="outline" icon={CheckCircle2} disabled>Triaged</Button>
                )}
                <Button variant="secondary" onClick={(e: any) => handleCreateCase(e, alert)}>Create Case</Button>
              </div>
            </div>

            {/* AI Analysis Result */}
            {alert.aiTriage && (
              <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-purple-500/10 rounded">
                    <Cpu size={16} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-purple-200">AI Analysis</span>
                      <Badge color={alert.aiTriage.severity === Severity.CRITICAL ? 'red' : 'yellow'}>
                        {alert.aiTriage.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{alert.aiTriage.summary}</p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <span className="text-xs uppercase tracking-wider text-slate-500 mb-1 block">Extracted IOCs</span>
                        <div className="flex flex-wrap gap-1">
                          {alert.aiTriage.iocs.map((ioc, i) => (
                            <span key={i} className="text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">
                              {ioc.value}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                         <span className="text-xs uppercase tracking-wider text-slate-500 mb-1 block">Recommended Checks</span>
                         <ul className="text-xs text-slate-400 list-disc list-inside">
                           {alert.aiTriage.recommendedChecks.slice(0, 2).map((c, i) => <li key={i}>{c}</li>)}
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
    </div>
  );
};

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
          <Button variant="ghost" onClick={onBack} icon={ArrowLeft}>Back</Button>
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
  const [view, setView] = useState<'dashboard' | 'case'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  
  // Cases count for sidebar
  const [caseCount, setCaseCount] = useState(0);

  useEffect(() => {
    const update = () => setCaseCount(store.getCases().length);
    update();
    return store.subscribe(update);
  }, []);

  const handleAlertSelect = (id: string) => {
    // For demo, clicking alert just creates case automatically if not exists or directs to it?
    // Let's keep it simple: Create case manually via button, or click alert to see detail (not implemented in this minimal scope, assuming inbox view is rich enough).
    // Actually, let's make clicking an alert toggles expanded view in inbox (already handled).
  };

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
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-900/30 text-blue-200' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
          >
            <span className="flex items-center gap-3"><AlertTriangle size={18} /> Alerts</span>
            <Badge color="red">{store.getAlerts().length}</Badge>
          </button>
          
          <div className="pt-6 pb-2 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Active Cases</div>
          <div className="space-y-1">
             {store.getCases().length === 0 && <div className="px-3 text-sm text-slate-600 italic">No open cases</div>}
             {store.getCases().map(c => (
               <button
                 key={c.id}
                 onClick={() => navigateToCase(c.id)}
                 className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${selectedCaseId === c.id && view === 'case' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 <div className={`w-2 h-2 rounded-full ${c.status === 'Open' ? 'bg-green-500' : 'bg-slate-500'}`} />
                 <span className="truncate">{c.id}</span>
               </button>
             ))}
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
            {view === 'dashboard' ? (
              <AlertsView onSelectAlert={handleAlertSelect} />
            ) : (
              selectedCaseId && <CaseDetailView caseId={selectedCaseId} onBack={() => setView('dashboard')} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}