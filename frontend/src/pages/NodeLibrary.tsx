import { Cpu, Layers, Box, Play, AlertCircle, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import DeploymentModal from '../components/DeploymentModal'; // Ensure this points to your file

const ICON_MAP: Record<string, React.ReactNode> = {
  'obj_det': <Box className="text-blue-400" />,
  'obj_seg': <Layers className="text-purple-400" />,
  'lidar_proc': <Cpu className="text-emerald-400" />,
  'default': <Box className="text-slate-400" />
};

export default function NodeLibrary() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:8000/api/node-repository');
        if (!response.ok) throw new Error('Failed to fetch node catalog');
        const data = await response.json();
        setNodes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // THE DEPLOYMENT LOGIC
  const handleDeploy = async (finalConfig: any) => {
    if (!selectedNode) return;

    try {
      const response = await fetch(`http://localhost:8000/start/${selectedNode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalConfig)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`🚀 Mission Launched! Container: ${result.id.substring(0, 12)}`);
        
        // --- THIS CLOSES THE MODAL ---
        setSelectedNode(null); 
      } else {
        const errData = await response.json();
        alert(`❌ Deployment Failed: ${errData.detail}`);
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Backend unreachable. Ensure FastAPI is running.");
    }
  };

  if (isLoading) return (
    <div className="h-64 flex flex-col items-center justify-center space-y-4">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Syncing Registry...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Node Repository</h3>
          <p className="text-slate-500 text-sm">Deploy modular perception nodes from GHCR to your workstation.</p>
        </div>
        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Registry Connected</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nodes.map((node) => (
          <div key={node.id} className="group relative bg-slate-900/40 border border-white/5 rounded-3xl p-6 hover:border-blue-500/50 transition-all flex flex-col h-full shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">
                {ICON_MAP[node.id] || ICON_MAP['default']}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-1 rounded">
                {node.category}
              </span>
            </div>

            <h4 className="text-lg font-bold text-white mb-2">{node.name}</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1 italic">{node.description}</p>

            {/* THE VISUAL TAGS/IMAGE BOX YOU LIKED */}
            <div className="space-y-3 bg-black/20 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-mono text-blue-400 truncate opacity-60">{node.image}</p>
              <div className="flex flex-wrap gap-2">
                 <span className="text-[9px] px-2 py-1 bg-white/5 text-slate-400 border border-white/10 rounded">
                   Default: {node.params.default_model}
                 </span>
                 <span className="text-[9px] px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                   {node.params.input_type.split('/').pop()}
                 </span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedNode(node)}
              className="mt-6 w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
            >
              <Play size={14} fill="currentColor" /> Configure & Deploy
            </button>
          </div>
        ))}
      </div>

      {/* RENDER THE ADVANCED MODAL */}
      {selectedNode && (
        <DeploymentModal 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
          onDeploy={handleDeploy} 
        />
      )}
    </div>
  );
}