import { useState, useEffect } from 'react';
import { 
  FileVideo, Radio, ArrowRight, CheckCircle2, ChevronLeft, 
  X, Rocket, Settings, Info, AlertTriangle, FolderOpen, FileCode 
} from 'lucide-react';
import FileBrowser from '../components/FileBrowser';

// --- SUB-COMPONENT: PARAMETER MODAL (With File Browser) ---
function ParamModal({ node, onClose, onConfirm }: { 
  node: any, 
  onClose: () => void, 
  onConfirm: (params: any) => void 
}) {
  const [config, setConfig] = useState<any>({});
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [isTopicConflict, setIsTopicConflict] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browserData, setBrowserData] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/topics')
      .then(res => res.json())
      .then(data => setExistingTopics(data.map((t: any) => t.name)))
      .catch(() => console.error("Sync failed"));

    const defaults: any = { model_path: node.params.default_model };
    node.launch_args?.forEach((arg: string) => {
      if (arg !== 'model_path') {
        const key = arg.split('_')[1] || arg; 
        defaults[arg] = node.params[`default_${key}`] || "";
      }
    });
    setConfig(defaults);
  }, [node]);

  const fetchFiles = async (path?: string) => {
    const url = path 
        ? `http://localhost:8000/api/browse-models?path=${encodeURIComponent(path)}` 
        : `http://localhost:8000/api/browse-models`;
    const res = await fetch(url);
    const data = await res.json();
    setBrowserData(data);
  };

  const isModelArg = (arg: string) => arg.toLowerCase().includes('model') || arg.toLowerCase().includes('weight');

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold">Node Parameters</h3>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{node.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-zinc-400 text-[11px] flex items-center gap-2 mb-4 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
            <Info size={14} className="text-blue-500" /> Fine-tune the node before starting the container.
          </p>
          <div className="grid grid-cols-1 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {node.launch_args?.map((arg: string) => (
              <div key={arg} className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">{arg.replace(/_/g, ' ')}</label>
                {isModelArg(arg) ? (
                  <div className="flex gap-2">
                    <input readOnly value={config[arg] || ""} className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] text-blue-400 font-mono truncate" />
                    <button onClick={() => { setIsBrowsing(true); fetchFiles(); }} className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-colors"><FolderOpen size={16} /></button>
                  </div>
                ) : (
                  <input 
                    value={config[arg] || ""}
                    onChange={(e) => setConfig({...config, [arg]: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                    placeholder={`Enter ${arg}...`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {isBrowsing && browserData && (
          <div className="absolute inset-0 z-[200] bg-zinc-950 flex flex-col p-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsBrowsing(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400"><ChevronLeft size={20}/></button>
                <h4 className="text-white font-bold text-sm">Select Model Weight</h4>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 bg-black/40 rounded-3xl p-3 border border-white/5 custom-scrollbar">
              {browserData.items.map((item: any) => (
                <button key={item.path} onClick={() => item.is_dir ? fetchFiles(item.path) : (setConfig({...config, [node.launch_args.find(isModelArg)]: item.path}), setIsBrowsing(false))} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 text-left transition-all">
                  {item.is_dir ? <FolderOpen size={16} className="text-blue-400"/> : <FileCode size={16} className="text-emerald-400"/>}
                  <span className="text-xs text-zinc-300 truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-8 bg-zinc-950/50 border-t border-white/5">
          <button onClick={() => onConfirm(config)} className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-lg"><Rocket size={14}/> Launch Mission</button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN LAUNCHPAD COMPONENT (With Headers/Descriptions) ---
export default function Launchpad({ nodes }: { nodes: any[] }) {
  const [sourceType, setSourceType] = useState<'topic' | 'bag' | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [showParamModal, setShowParamModal] = useState(false);

  useEffect(() => {
    if (sourceType === 'topic') {
      fetch('http://localhost:8000/api/topics').then(res => res.json()).then(data => setTopics(data)).catch(err => console.error(err));
    }
  }, [sourceType]);

  const handleFileSelect = async (path: string) => {
    setSelectedSource(path);
    setSelectedSubTopic(null);
    try {
      const response = await fetch(`http://localhost:8000/api/inspect_bag?path=${encodeURIComponent(path)}`);
      setTopics(await response.json());
    } catch (err) { console.error(err); }
  };

  const handleFinalDeploy = async (customParams: any) => {
    if (!selectedNode) return;
    const body = JSON.stringify({
      input_topic: sourceType === 'bag' ? selectedSubTopic : selectedSource,
      source_type: sourceType,
      bag_path: sourceType === 'bag' ? selectedSource : null,
      ...customParams
    });
    const res = await fetch(`http://localhost:8000/start/${selectedNode.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (res.ok) { alert("🚀 Mission Launched!"); setShowParamModal(false); }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h3 className="text-2xl font-bold text-white tracking-tight">Mission Launchpad</h3>
        <p className="text-slate-500 text-sm">Connect data sources to perception nodes for processing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* STEP 1: SOURCE SELECTION */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">01</span>
            <h4 className="font-bold text-white uppercase tracking-widest text-[10px]">Select Input Source</h4>
          </div>

          <div className="flex gap-4">
            <button onClick={() => {setSourceType('topic'); setSelectedSource(null);}} className={`flex-1 p-6 rounded-2xl border transition-all text-left ${sourceType === 'topic' ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-white/5'}`}>
              <Radio className="mb-3 text-blue-400" size={20} />
              <p className="text-sm font-bold text-white">Live ROS2 Topic</p>
            </button>
            <button onClick={() => {setSourceType('bag'); setSelectedSource(null);}} className={`flex-1 p-6 rounded-2xl border transition-all text-left ${sourceType === 'bag' ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-white/5'}`}>
              <FileVideo className="mb-3 text-blue-400" size={20} />
              <p className="text-sm font-bold text-white">ROSbag File</p>
            </button>
          </div>

          <div className="bg-slate-950/50 rounded-2xl border border-white/5 min-h-[300px] p-4">
            {sourceType === 'topic' && topics.map(t => (
              <button key={t.name} onClick={() => setSelectedSource(t.name)} className={`w-full p-3 mb-2 rounded-xl border transition-all ${selectedSource === t.name ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-white/5 border-transparent text-slate-400'}`}>
                <p className="text-xs font-bold font-mono text-left">{t.name}</p>
                <p className="text-[10px] opacity-50 text-left">{t.type}</p>
              </button>
            ))}
            {sourceType === 'bag' && (
              !selectedSource ? <FileBrowser onFileSelect={handleFileSelect} /> : (
                <div className="space-y-4">
                  <button onClick={() => setSelectedSource(null)} className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-white uppercase font-bold tracking-widest"><ChevronLeft size={14}/> Change Bag</button>
                  {topics.map(t => (
                    <button key={t.name} onClick={() => setSelectedSubTopic(t.name)} className={`w-full p-3 rounded-xl border ${selectedSubTopic === t.name ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-transparent text-slate-400'}`}>
                      <p className="text-xs font-bold font-mono text-left">{t.name}</p>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* STEP 2: NODE SELECTION */}
        <div className={`space-y-6 transition-all duration-500 ${(!selectedSource && sourceType !== 'bag') || (sourceType === 'bag' && !selectedSubTopic) ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">02</span>
            <h4 className="font-bold text-white uppercase tracking-widest text-[10px]">Processing Node</h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {nodes.map(node => (
              <button key={node.id} onClick={() => setSelectedNode(node)} className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${selectedNode?.id === node.id ? 'bg-blue-500/10 border-blue-500' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">{node.name}</p>
                  <p className="text-[10px] text-slate-500 italic">Validated Interface</p>
                </div>
                {selectedNode?.id === node.id && <CheckCircle2 size={18} className="text-blue-400" />}
              </button>
            ))}
          </div>

          <div className="pt-6">
            <button onClick={() => setShowParamModal(true)} disabled={!selectedNode} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${selectedNode ? 'bg-white text-black hover:bg-blue-600 shadow-xl' : 'bg-slate-800 text-slate-600'}`}>
              Configure & Launch <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {showParamModal && <ParamModal node={selectedNode} onClose={() => setShowParamModal(false)} onConfirm={handleFinalDeploy} />}
    </div>
  );
}