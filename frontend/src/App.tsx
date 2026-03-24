import { useState } from 'react'
import { Activity, LayoutGrid, Box, Terminal, Play, Square, Cpu, HardDrive, Settings2, X } from 'lucide-react'
import NodeLibrary from './pages/NodeLibrary'
import Launchpad from './pages/Launchpad';
import { NODE_TYPES } from './pages/NodeLibrary';

function App() {
  const [activeTab, setActiveTab] = useState('fleet');
  const [selectedNodeTemplate, setSelectedNodeTemplate] = useState<any>(null);
  
  // State for nodes currently running in your "Fleet"
  const [activeNodes, setActiveNodes] = useState([
    { id: 7721, name: 'Leaf_Seg_Worker', type: 'Detection', weights: 'V11.0.4', status: 'Running' }
  ]);

  const deployNode = (weights: string) => {
    const newNode = {
      id: Math.floor(Math.random() * 9000) + 1000,
      name: `${selectedNodeTemplate.name.replace(' ', '_')}_Instance`,
      type: selectedNodeTemplate.name,
      weights: weights,
      status: 'Idle'
    };
    setActiveNodes([...activeNodes, newNode]);
    setSelectedNodeTemplate(null);
    setActiveTab('fleet');
  };

  const toggleNodeStatus = (id: number) => {
    setActiveNodes(nodes => nodes.map(n => 
      n.id === id ? { ...n, status: n.status === 'Running' ? 'Idle' : 'Running' } : n
    ));
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
            <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center bg-slate-900"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /></div>
          </div>
        </header>

        <section className="p-10">
          {activeTab === 'fleet' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white tracking-tight">Active Perception Nodes</h3>
                <p className="text-slate-500 text-sm">Monitor and control your deployed instances.</p>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {activeNodes.map(node => (
                  <div key={node.id} className="relative group bg-slate-900/40 border border-white/10 rounded-2xl p-8 transition-all hover:border-blue-500/50">
                    <div className="absolute top-0 right-0 p-6 opacity-5"><HardDrive size={80} /></div>
                    <div className="flex justify-between items-start mb-10 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded uppercase tracking-wider">{node.type}</span>
                          <span className="text-slate-600 text-[10px] font-bold">{node.weights}</span>
                        </div>
                        <h4 className="text-xl font-bold text-white">{node.name}</h4>
                        <p className="text-sm text-slate-400 mt-1 italic opacity-60">ID: {node.id} • Docker Runtime</p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${node.status === 'Running' ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-slate-800/50 border-white/5 text-slate-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'Running' ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="text-[10px] font-black tracking-widest uppercase">{node.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 relative z-10">
                      <button onClick={() => toggleNodeStatus(node.id)} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm transition-all ${node.status === 'Idle' ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white'}`}>
                        {node.status === 'Idle' ? <><Play size={16} /> Start</> : <><Square size={16} /> Terminate</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'launchpad' && <Launchpad nodes={NODE_TYPES} />}

          {activeTab === 'models' && <NodeLibrary onSelectNode={(node) => setSelectedNodeTemplate(node)} />}
          
          {activeTab === 'logs' && (
            <div className="bg-black/40 rounded-2xl p-6 font-mono text-xs text-blue-400 border border-white/5 h-[600px] overflow-y-auto whitespace-pre-wrap">
              {`> [SYSTEM]: Initializing perception stream...\n> [DOCKER]: Container 7721 verified.\n> [GPU]: NVIDIA RTX Found (8GB VRAM)\n> [YOLO]: Loading Weights v11.0.4...\n> [LOG]: Inference stable at 14ms.`}
            </div>
          )}
        </section>
      </main>

      {/* NODE CONFIGURATION MODAL */}
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
              {selectedNodeTemplate.availableWeights.map((weight: string) => (
                <button key={weight} onClick={() => deployNode(weight)} className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500 hover:bg-blue-500/5 transition-all flex justify-between items-center group">
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-blue-400">{weight}</p>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tighter">FP16 Optimized</p>
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