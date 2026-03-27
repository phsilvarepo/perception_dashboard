import { X, Rocket, Settings, Info, AlertTriangle, FolderOpen, FileCode } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ParamModal({ node, onClose, onConfirm }: { 
  node: any, 
  onClose: () => void, 
  onConfirm: (params: any) => void 
}) {
  const [config, setConfig] = useState<any>({});
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [isTopicConflict, setIsTopicConflict] = useState(false);

  // File Browser State
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browserData, setBrowserData] = useState<any>(null);

  useEffect(() => {
    // 1. Sync topics for collision detection
    fetch('http://localhost:8000/api/topics')
      .then(res => res.json())
      .then(data => setExistingTopics(data.map((t: any) => t.name)))
      .catch(() => console.error("Sync failed"));

    // 2. Initialize defaults with better key matching
    const defaults: any = {};
    
    node.launch_args?.forEach((arg: string) => {
      // Priority 1: Exact match (e.g., default_model_path)
      // Priority 2: Common shorthands (conf, res)
      // Priority 3: The "default_model" global key
      // Priority 4: Hardcoded safe fallbacks instead of empty strings
      
      const fallback = node.params[`default_${arg}`] || "";
      
      if (arg === 'model_path') {
        defaults[arg] = node.params.default_model || "/models/yolo11n.pt";
      } else if (arg === 'confidence_threshold') {
        defaults[arg] = node.params.default_conf || "0.5";
      } else if (arg === 'image_resolution') {
        defaults[arg] = node.params.default_res || "640";
      } else {
        defaults[arg] = fallback;
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

  const handleInputChange = (arg: string, value: string) => {
    const newConfig = { ...config, [arg]: value };
    if (arg === 'output_topic') {
      const formatted = value.startsWith('/') ? value : `/${value}`;
      setIsTopicConflict(existingTopics.includes(formatted));
    }
    setConfig(newConfig);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold">Node Configuration</h3>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{node.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <p className="text-zinc-400 text-[11px] flex items-center gap-2 mb-4 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
              <Info size={14} className="text-blue-500" /> Define runtime parameters.
            </p>
            
            <div className="grid grid-cols-1 gap-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
              {node.launch_args.map((arg: string) => (
                <div key={arg} className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      {arg.replace(/_/g, ' ')}
                    </label>
                    {arg === 'output_topic' && isTopicConflict && (
                      <span className="text-[9px] text-red-500 font-bold flex items-center gap-1 uppercase">
                        <AlertTriangle size={10}/> Topic in use
                      </span>
                    )}
                  </div>
                  
                  {arg === 'model_path' ? (
                    <div className="flex gap-2">
                      <input 
                        readOnly
                        value={config[arg] || ""}
                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] text-blue-400 font-mono truncate"
                      />
                      <button 
                        onClick={() => { setIsBrowsing(true); fetchFiles(); }}
                        className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-colors"
                      >
                        <FolderOpen size={16} />
                      </button>
                    </div>
                  ) : (
                    <input 
                      value={config[arg] || ""}
                      onChange={(e) => handleInputChange(arg, e.target.value)}
                      className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-sm text-white outline-none transition-all ${
                        arg === 'output_topic' && isTopicConflict ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-blue-500/50'
                      }`}
                      placeholder={arg === 'output_topic' ? "Auto-generate unique ID" : `Enter ${arg}...`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* File Browser Overlay */}
        {isBrowsing && browserData && (
          <div className="absolute inset-0 z-[200] bg-zinc-950/95 flex flex-col p-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-white font-bold">Select Model Weight</h4>
                <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[250px]">{browserData.current}</p>
              </div>
              <button onClick={() => setIsBrowsing(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} className="text-zinc-500"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 bg-black/20 rounded-2xl p-2 border border-white/5 custom-scrollbar">
              {browserData.items.map((item: any) => (
                <button
                  key={item.path}
                  onClick={() => item.is_dir ? fetchFiles(item.path) : (setConfig({...config, model_path: item.path}), setIsBrowsing(false))}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-all"
                >
                  {item.is_dir ? <FolderOpen size={16} className="text-blue-400"/> : <FileCode size={16} className="text-emerald-400"/>}
                  <span className={`text-xs ${item.is_dir ? "text-zinc-300" : "text-emerald-400 font-bold"}`}>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-8 bg-zinc-950/50 border-t border-white/5">
          <button 
            onClick={() => onConfirm(config)}
            disabled={isTopicConflict || isBrowsing}
            className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 shadow-xl"
          >
            <Rocket size={14}/> Start Mission
          </button>
        </div>
      </div>
    </div>
  );
}