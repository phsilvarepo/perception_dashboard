import React, { useState, useEffect } from 'react';
import { X, Rocket, Cpu, Globe, Info, AlertTriangle, FolderOpen, FileCode, ChevronLeft } from 'lucide-react';

interface NodeTemplate {
  id: string;
  name: string;
  image: string;
  params: {
    input_type: string;
    default_model: string;
    [key: string]: any;
  };
  launch_args: string[];
}

export default function DeploymentModal({ node, onClose, onDeploy }: { 
  node: NodeTemplate | null, 
  onClose: () => void, 
  onDeploy: (config: any) => void 
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [availableTopics, setAvailableTopics] = useState<{name: string, type: string}[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  
  // File Browser State
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browserData, setBrowserData] = useState<any>(null);

  useEffect(() => {
    if (node) {
      const defaults: any = { model_path: node.params.default_model };
      node.launch_args.forEach(arg => {
        if (arg !== 'model_path') {
          defaults[arg] = node.params[`default_${arg}`] || "";
        }
      });
      setFormData(defaults);
      fetchSystemTopics();
    }
  }, [node]);

  const fetchSystemTopics = async () => {
    const res = await fetch('http://localhost:8000/api/topics');
    const data = await res.json();
    setAvailableTopics(data.filter((t: any) => t.type === node?.params.input_type));
  };

  const fetchFiles = async (path?: string) => {
    const url = path ? `http://localhost:8000/api/browse-models?path=${encodeURIComponent(path)}` : `http://localhost:8000/api/browse-models`;
    const res = await fetch(url);
    const data = await res.json();
    setBrowserData(data);
  };

  if (!node) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Cpu size={20}/></div>
            <div>
              <h3 className="text-lg font-bold text-white">{node.name}</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">Step {step} of 2</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
          {step === 1 ? (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Info size={16}/> 
                <span className="text-xs font-bold uppercase tracking-tighter">Configuration Parameters</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {node.launch_args.map(arg => (
                  <div key={arg} className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                      {arg.replace(/_/g, ' ')}
                    </label>
                    
                    {arg === 'model_path' ? (
                      <div className="flex gap-1">
                        <input 
                          readOnly
                          className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] text-blue-400 font-mono truncate"
                          value={formData[arg] || ""}
                        />
                        <button 
                          onClick={() => { setIsBrowsing(true); fetchFiles(); }}
                          className="px-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                      </div>
                    ) : (
                      <input 
                        className="w-full bg-black/40 border border-white/5 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                        value={formData[arg] || ""}
                        onChange={(e) => setFormData({...formData, [arg]: e.target.value})}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
               {/* Topic Selection UI stays as per your original code */}
               <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Globe size={16}/> 
                <span className="text-xs font-bold uppercase tracking-tighter">Select Input Source</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {availableTopics.map(topic => (
                  <button 
                    key={topic.name}
                    onClick={() => setSelectedTopic(topic.name)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedTopic === topic.name ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-mono">{topic.name}</p>
                      <p className="text-[10px] opacity-40">{topic.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* File Browser Overlay */}
        {isBrowsing && browserData && (
          <div className="absolute inset-0 z-[300] bg-zinc-950/90 backdrop-blur-sm flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-white font-bold">Select Model Weight</h4>
                <p className="text-[10px] text-zinc-500 font-mono truncate max-w-xs">{browserData.current}</p>
              </div>
              <button onClick={() => setIsBrowsing(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} className="text-zinc-500"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 bg-black/20 rounded-2xl p-2 border border-white/5">
              {browserData.items.map((item: any) => (
                <button
                  key={item.path}
                  onClick={() => item.is_dir ? fetchFiles(item.path) : (setFormData({...formData, model_path: item.path}), setIsBrowsing(false))}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-all"
                >
                  {item.is_dir ? <FolderOpen size={16} className="text-blue-400"/> : <FileCode size={16} className="text-emerald-400"/>}
                  <span className={`text-xs ${item.is_dir ? "text-zinc-300" : "text-emerald-400 font-bold"}`}>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 bg-black/20 border-t border-white/5 flex gap-3">
          {step === 2 && <button onClick={() => setStep(1)} className="flex-1 py-4 text-zinc-500 font-bold text-sm uppercase">Back</button>}
          <button 
            onClick={() => step === 1 ? setStep(2) : onDeploy({...formData, input_topic: selectedTopic})}
            className="flex-[2] py-4 bg-white text-black rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
          >
            {step === 1 ? "Next: Select Source" : "Confirm & Deploy"}
          </button>
        </div>
      </div>
    </div>
  );
}