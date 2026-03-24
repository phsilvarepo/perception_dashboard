import { Box, CheckCircle2, AlertCircle, Download, Trash2, Cpu, Zap } from 'lucide-react';

const MODELS = [
  { 
    id: 1, name: 'YOLOv11n-Leaf', version: 'v2.1.0', 
    status: 'Ready', size: '24.5 MB', latency: '4.2ms', 
    accuracy: '0.89 mAP', type: 'TensorRT' 
  },
  { 
    id: 2, name: 'Seg-Everything-Plant', version: 'v1.0.4', 
    status: 'Downloading', size: '156 MB', latency: '18.1ms', 
    accuracy: '0.94 mAP', type: 'ONNX' 
  },
  { 
    id: 3, name: 'YOLOv10-Fruit-Detect', version: 'v4.0.0', 
    status: 'Incompatible', size: '48.2 MB', latency: 'N/A', 
    accuracy: '0.82 mAP', type: 'PyTorch' 
  },
];

export default function ModelLibrary() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Model Library</h3>
          <p className="text-slate-500 text-sm">Manage optimized weights and inference runtimes.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
          <Download size={16} /> Import Weights
        </button>
      </div>

      {/* MODEL GRID */}
      <div className="grid grid-cols-1 gap-4">
        {MODELS.map((model) => (
          <div key={model.id} className="group bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex items-center gap-6">
            
            {/* ICON & STATUS */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
              model.status === 'Ready' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
              model.status === 'Downloading' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 
              'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <Box size={24} />
            </div>

            {/* INFO */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="text-white font-bold truncate">{model.name}</h4>
                <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 border border-white/5 rounded bg-white/5">{model.version}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Cpu size={12}/> {model.type}</span>
                <span className="flex items-center gap-1 font-mono tracking-tighter">{model.size}</span>
              </div>
            </div>

            {/* METRICS (This gives it the "Pro" look) */}
            <div className="hidden md:flex gap-8 px-8">
               <Metric label="Latency" value={model.latency} icon={<Zap size={12} className="text-yellow-500"/>} />
               <Metric label="Accuracy" value={model.accuracy} icon={<CheckCircle2 size={12} className="text-green-500"/>} />
            </div>

            {/* STATUS CHIP */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className={`text-xs font-black uppercase tracking-widest ${
                  model.status === 'Ready' ? 'text-green-400' : 
                  model.status === 'Downloading' ? 'text-yellow-500' : 'text-red-400'
                }`}>
                  {model.status}
                </p>
                {model.status === 'Downloading' && (
                  <div className="w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-yellow-500 w-1/2 animate-pulse" />
                  </div>
                )}
              </div>
              
              <button className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-sm font-bold text-slate-200">{value}</p>
    </div>
  )
}