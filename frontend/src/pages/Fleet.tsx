import { useState, useEffect } from 'react';
import { Play, Square, HardDrive, Pause, Info, X, Activity, Globe, Hash, Eye, Terminal } from 'lucide-react';

interface Node {
  id: string;
  name: string;
  type: string;
  weights: string;
  status: string;
  input_topic: string;
  output_topic: string;
  container_id: string;
  output_type: string; // Added to handle different message types
}

interface FleetProps {
  nodes: Node[];
  onToggleStatus: (id: string, action: 'terminate' | 'pause' | 'resume') => void;
}

export default function Fleet({ nodes, onToggleStatus }: FleetProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [liveData, setLiveData] = useState<any[]>([]);

  // Polling effect for non-image data (like OCR results)
  useEffect(() => {
    let interval: any;
    if (selectedNode && selectedNode.output_type !== "sensor_msgs/msg/Image") {
      setLiveData([]); // Clear old data on switch
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/data?topic=${selectedNode.output_topic}&type=${selectedNode.output_type}`);
          if (res.ok) {
            const data = await res.json();
            setLiveData(data);
          }
        } catch (err) {
          console.error("Data polling error:", err);
        }
      }, 500); // Polling at 2Hz for text data
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedNode]);

  const formatTopic = (topic: string) => {
    if (!topic) return "N/A";
    return topic.startsWith('//') ? topic.substring(1) : topic;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h3 className="text-3xl font-bold text-white tracking-tight">Fleet Overview</h3>
        <p className="text-zinc-400 text-sm font-medium">Control and inspect active perception workers.</p>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {nodes.map(node => (
          <div key={node.id} className="relative group bg-zinc-900/60 border border-white/10 rounded-2xl p-7 transition-all hover:border-sky-500/50 shadow-xl">
            <div className="cursor-pointer" onClick={() => setSelectedNode(node)}>
              <div className="flex justify-between items-start mb-8 relative z-10 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-sky-500/20 text-sky-300 text-[10px] font-black rounded-md uppercase tracking-widest border border-sky-500/20">
                      {node.type}
                    </span>
                    <span className="text-zinc-300 text-[11px] font-bold font-mono px-2 py-1 bg-white/5 rounded">
                      {node.weights}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-white truncate group-hover:text-sky-400 transition-colors">
                    {node.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 text-sky-400/80">
                    <Globe size={12} />
                    <p className="text-[11px] font-bold font-mono tracking-tight">
                      {formatTopic(node.output_topic)}
                    </p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black tracking-widest shadow-sm ${
                  node.status === 'Running' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                  node.status === 'Paused' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-zinc-800 border-white/10 text-zinc-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'Running' ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
                  {node.status.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="flex gap-3 relative z-10 pt-4 border-t border-white/5">
              <button 
                onClick={() => onToggleStatus(node.id, node.status === 'Paused' ? 'resume' : 'pause')}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all bg-white text-zinc-950 hover:bg-sky-400 shadow-lg active:scale-95"
              >
                {node.status === 'Paused' ? <><Play size={14} fill="currentColor" /> Resume</> : <><Pause size={14} fill="currentColor" /> Pause</>}
              </button>

              <button 
                onClick={() => onToggleStatus(node.id, 'terminate')}
                className="w-14 flex items-center justify-center h-11 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95"
              >
                <Square size={16} fill="none" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedNode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedNode(null)} />
          <div className="bg-zinc-900 border border-white/20 w-full max-w-4xl rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-500/20">
                      <Eye size={24}/>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Node Inspector</h3>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Live Telemetry & Config</p>
                    </div>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-all">
                  <X size={24}/>
                </button>
            </div>

            {/* LIVE FEEDS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {/* INPUT FEED (Always Image) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Input: {formatTopic(selectedNode.input_topic)}</p>
                  <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">Sensor</span>
                </div>
                <div className="aspect-video rounded-3xl bg-black border border-white/5 overflow-hidden shadow-inner">
                  <img 
                    src={`http://localhost:8000/api/stream?topic=${selectedNode.input_topic}`} 
                    className="w-full h-full object-contain"
                    alt="Input Stream"
                    onError={(e) => (e.currentTarget.src = "https://placehold.co/640x360/09090b/404040?text=Stream+Offline")}
                  />
                </div>
              </div>

              {/* DYNAMIC OUTPUT FEED */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Output: {formatTopic(selectedNode.output_topic)}</p>
                  <span className="text-[9px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded font-bold uppercase">Inference</span>
                </div>
                <div className="aspect-video rounded-3xl bg-black border border-sky-500/20 overflow-hidden shadow-inner flex flex-col">
                  {selectedNode.output_type === "sensor_msgs/msg/Image" ? (
                    <img 
                      src={`http://localhost:8000/api/stream?topic=${selectedNode.output_topic}`} 
                      className="w-full h-full object-contain"
                      alt="Output Stream"
                      onError={(e) => (e.currentTarget.src = "https://placehold.co/640x360/09090b/404040?text=Processing...")}
                    />
                  ) : (
                    <div className="flex-1 p-5 font-mono text-xs overflow-y-auto bg-zinc-950 custom-scrollbar">
                       <div className="flex items-center gap-2 text-sky-500 mb-4 border-b border-sky-500/20 pb-2">
                          <Terminal size={14} />
                          <span className="font-black uppercase tracking-tighter">Data Stream ({selectedNode.output_type.split('/').pop()})</span>
                        </div>
                        {liveData && liveData.length > 0 ? (
                          liveData.map((item, i) => (
                            <div key={i} className="mb-2 flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5 animate-in slide-in-from-left-2 duration-300">
                              <span className="text-zinc-100 font-bold">{item.text || JSON.stringify(item)}</span>
                              {item.conf && (
                                <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                                  {(item.conf * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                             <div className="w-1 h-1 bg-zinc-600 rounded-full animate-ping" />
                             <p className="italic">Waiting for inference data...</p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailRow label="Container Name" value={selectedNode.name} icon={<HardDrive size={16}/>}/>
                <DetailRow label="Processing Type" value={selectedNode.type} icon={<Activity size={16}/>}/>
                <DetailRow label="Model Weights" value={selectedNode.weights} icon={<Hash size={16}/>}/>
                <DetailRow label="Global Docker ID" value={selectedNode.id.substring(0,12)} icon={<Info size={16}/>}/>
            </div>

            <div className="mt-10">
                <button onClick={() => setSelectedNode(null)} className="w-full py-4 bg-zinc-100 hover:bg-white text-zinc-950 font-black text-xs uppercase rounded-2xl transition-all shadow-lg active:scale-[0.98]">
                  Dismiss Inspector
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, icon, highlight }: any) {
    return (
        <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-4">
                <span className="text-sky-500/70">{icon}</span>
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.15em]">{label}</span>
            </div>
            <span className={`text-sm font-bold truncate max-w-[150px] ${highlight ? 'text-sky-400' : 'text-zinc-100'}`}>
                {value}
            </span>
        </div>
    )
}