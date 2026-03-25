import { Play, Square, HardDrive } from 'lucide-react';

interface Node {
  id: string | number;
  name: string;
  type: string;
  weights: string;
  status: string;
  container_id?: string;
}

interface FleetProps {
  nodes: Node[];
  onToggleStatus: (id: string | number) => void;
}

export default function Fleet({ nodes, onToggleStatus }: FleetProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white tracking-tight">Active Perception Nodes</h3>
        <p className="text-slate-500 text-sm">Monitor and control your deployed instances.</p>
      </div>
      
      {nodes.length === 0 ? (
        <div className="border-2 border-dashed border-white/5 rounded-3xl p-20 text-center">
          <p className="text-slate-600 font-medium">No active nodes in the fleet. Head to Launchpad to deploy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {nodes.map(node => (
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
                <button 
                  onClick={() => onToggleStatus(node.id)} 
                  className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm transition-all ${node.status === 'Idle' ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white'}`}
                >
                  {node.status === 'Idle' ? <><Play size={16} /> Start</> : <><Square size={16} /> Terminate</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}