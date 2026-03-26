import { useState, useEffect } from 'react'
import { Activity, LayoutGrid, Box, Terminal, Play, Cpu, Settings2, X } from 'lucide-react'
import NodeLibrary from './pages/NodeLibrary'
import Launchpad from './pages/Launchpad'
import Fleet from './pages/Fleet'

function App() {
  const [activeTab, setActiveTab] = useState('fleet');
  const [selectedNodeTemplate, setSelectedNodeTemplate] = useState<any>(null);
  const [nodeTemplates, setNodeTemplates] = useState<any[]>([]);
  const [activeNodes, setActiveNodes] = useState<any[]>([]);

  // Sync Node Templates from Backend
  useEffect(() => {
    fetch('http://localhost:8000/api/node-repository')
      .then(res => res.json())
      .then(data => setNodeTemplates(data))
      .catch(err => console.error("Sync error:", err));
  }, []);

  // Sync Active Fleet from Docker via Backend
  const refreshFleet = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/fleet');
      if (res.ok) {
        const data = await res.json();
        setActiveNodes(data);
      }
    } catch (err) {
      console.error("Fleet sync error:", err);
    }
  };

  // Poll for fleet updates every 3 seconds
  useEffect(() => {
    refreshFleet();
    const interval = setInterval(refreshFleet, 3000);
    return () => clearInterval(interval);
  }, []);

  const deployNode = async (weights: string) => {
    // This UI function now triggers the actual backend deployment
    // The Launchpad component handles the POST /start call, 
    // but we can also trigger a refresh here if needed.
    setSelectedNodeTemplate(null);
    setActiveTab('fleet');
    setTimeout(refreshFleet, 1000);
  };

  const toggleNodeStatus = async (id: string, action: 'terminate' | 'pause' | 'resume') => {
    let endpoint = '';
    if (action === 'terminate') endpoint = `http://localhost:8000/stop/${id}`;
    else if (action === 'pause') endpoint = `http://localhost:8000/pause/${id}`;
    else if (action === 'resume') endpoint = `http://localhost:8000/resume/${id}`;

    try {
      const response = await fetch(endpoint, { method: 'POST' });
      if (response.ok) refreshFleet();
    } catch (err) {
      console.error(`Action ${action} failed`, err);
    }
  };

  return (
    <div className="min-h-screen flex font-sans selection:bg-blue-500/30 text-slate-300 bg-[#020617]">
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-950/40 backdrop-blur-md border-r border-white/5 p-8 flex flex-col sticky top-0 h-screen">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-700 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-none">CORE.AI</h1>
            <span className="text-[10px] text-blue-500 font-bold tracking-widest uppercase">Perception Lab</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1.5">
          <NavItem icon={<LayoutGrid size={18}/>} label="Fleet Overview" active={activeTab === 'fleet'} onClick={() => setActiveTab('fleet')} />
          <NavItem icon={<Play size={18}/>} label="Mission Launchpad" active={activeTab === 'launchpad'} onClick={() => setActiveTab('launchpad')} />
          <NavItem icon={<Box size={18}/>} label="Node Repository" active={activeTab === 'models'} onClick={() => setActiveTab('models')} />
          <NavItem icon={<Terminal size={18}/>} label="Node Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3 font-bold text-[10px] text-slate-400 uppercase leading-none">
              <Cpu size={14} className="text-blue-500" /> GPU Load
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[65%]" />
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-20 flex items-center justify-between px-10 sticky top-0 z-20 bg-[#020617]/80 backdrop-blur-md border-b border-white/5">
          <h2 className="text-sm font-semibold text-slate-400">Environment: <span className="text-white">Workstation_02</span></h2>
          <div className="flex items-center gap-6 text-right font-medium">
            <div className="hidden sm:block">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Network Status</p>
              <p className="text-xs text-green-400">127.0.0.1:8000</p>
            </div>
            <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center bg-slate-900">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </header>

        <section className="p-10">
          {activeTab === 'fleet' && <Fleet nodes={activeNodes} onToggleStatus={toggleNodeStatus} />}
          {activeTab === 'launchpad' && <Launchpad nodes={nodeTemplates} />}
          {activeTab === 'models' && <NodeLibrary onCreateNode={(node) => setSelectedNodeTemplate(node)} />}
          {activeTab === 'logs' && (
            <div className="bg-black/40 rounded-2xl p-6 font-mono text-xs text-blue-400 border border-white/5 h-[600px] overflow-y-auto whitespace-pre-wrap">
              {`> [SYSTEM]: Initializing perception stream...\n> [DOCKER]: Monitoring container fleet state...\n> [GPU]: NVIDIA RTX Found (8GB VRAM)\n> [SYNC]: Dashboard linked to Docker Engine.`}
            </div>
          )}
        </section>
      </main>

      {/* MODAL */}
      {selectedNodeTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" onClick={() => setSelectedNodeTemplate(null)} />
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Initialize {selectedNodeTemplate.name}</h3>
                <p className="text-sm text-slate-500">Select weights to deploy this node.</p>
              </div>
              <button onClick={() => setSelectedNodeTemplate(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {(selectedNodeTemplate.params?.available_weights || [selectedNodeTemplate.params?.default_model || 'Standard']).map((weight: string) => (
                <button key={weight} onClick={() => deployNode(weight)} className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500 hover:bg-blue-500/5 transition-all flex justify-between items-center group">
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-blue-400">{weight}</p>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tighter">Container-Optimized</p>
                  </div>
                  <Settings2 size={16} className="text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${active ? 'bg-blue-600/10 border-blue-500/20 text-white shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
      {icon}
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
  )
}

export default App