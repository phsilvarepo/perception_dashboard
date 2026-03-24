import { Cpu, Layers, Box, Play, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

// This map allows us to link JSON IDs to our beautiful React Icons
const ICON_MAP: Record<string, React.ReactNode> = {
  'obj_det': <Box className="text-blue-400" />,
  'obj_seg': <Layers className="text-purple-400" />,
  'lidar_proc': <Cpu className="text-emerald-400" />,
  'default': <Box className="text-slate-400" />
};

interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  complexity?: string;
  params: {
    default_model: string;
    available_weights?: string[];
  };
}

export default function NodeLibrary({ onCreateNode }: { onCreateNode: (node: any) => void }) {
  const [nodes, setNodes] = useState<NodeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Syncing with Registry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex flex-col items-center justify-center p-8 bg-red-500/5 rounded-2xl border border-red-500/20">
        <AlertCircle className="text-red-500 mb-2" size={32} />
        <p className="text-white font-bold">Catalog Offline</p>
        <p className="text-red-400 text-xs mt-1">{error}</p>
      </div>
    );
  }

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
          <div key={node.id} className="group relative bg-slate-900/40 border border-white/5 rounded-2xl p-6 hover:border-blue-500/50 transition-all flex flex-col h-full shadow-xl">
            
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">
                {ICON_MAP[node.id] || ICON_MAP['default']}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-1 rounded">
                {node.category}
              </span>
            </div>

            <h4 className="text-lg font-bold text-white mb-2">{node.name}</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1 italic">
              {node.description}
            </p>

            <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 pb-2">
                <span>Docker Source</span>
              </div>
              <p className="text-[10px] font-mono text-blue-400 truncate">{node.image}</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                 <span className="text-[9px] px-2 py-1 bg-white/5 text-slate-400 border border-white/10 rounded">
                    Default: {node.params.default_model}
                 </span>
              </div>
            </div>

            <button 
              onClick={() => onCreateNode(node)}
              className="mt-6 w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Play size={14} fill="currentColor" /> Configure & Deploy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}