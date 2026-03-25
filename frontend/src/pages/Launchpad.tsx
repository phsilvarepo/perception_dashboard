import { useState, useEffect } from 'react';
import { FileVideo, Radio, Cpu, ArrowRight, Box, CheckCircle2, ChevronLeft } from 'lucide-react';
import FileBrowser from '../components/FileBrowser';

export default function Launchpad({ nodes }: { nodes: any[] }) {
  const [sourceType, setSourceType] = useState<'topic' | 'bag' | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null); // This is the Bag Path or Topic Name
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null); // Specific topic inside a bag
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
  // These will hold the topics discovered from the system OR from a bag
  const [topics, setTopics] = useState<any[]>([]);

  // 1. Fetch live system topics when "Live ROS2 Topic" is selected
  useEffect(() => {
    if (sourceType === 'topic') {
      fetch('http://localhost:8000/api/topics')
        .then(res => res.json())
        .then(data => setTopics(data))
        .catch(err => console.error("Failed to fetch live topics", err));
    }
  }, [sourceType]);

  // 2. Handle selecting a bag file from the browser
  const handleFileSelect = async (path: string) => {
    setSelectedSource(path);
    setSelectedSubTopic(null); // Reset subtopic when bag changes
    
    try {
      const response = await fetch(`http://localhost:8000/api/inspect_bag?path=${encodeURIComponent(path)}`);
      const bagTopics = await response.json();
      setTopics(bagTopics); 
    } catch (err) {
      console.error("Failed to inspect bag", err);
    }
  };

  /// 3. Precise Filter logic using the input_type from nodes.json
  const compatibleNodes = nodes.filter(node => {
    // 1. Safety Check: If topics is not an array (due to backend error), return false
    if (!Array.isArray(topics)) return false;

    // Determine the ROS2 Message Type of the currently selected topic
    let activeTopicType = "";
    
    if (sourceType === 'topic') {
      const topicObj = topics.find(t => t.name === selectedSource);
      activeTopicType = topicObj?.type || "";
    } else if (sourceType === 'bag') {
      const topicObj = topics.find(t => t.name === selectedSubTopic);
      activeTopicType = topicObj?.type || "";
    }

    // 2. If no specific topic is selected yet, we show all nodes 
    // but the Step 2 UI is still locked by the opacity logic below.
    if (!activeTopicType) return true;

    const nodeRequiredType = node.params.input_type;
    
    // 3. Normalized comparison
    return activeTopicType.includes(nodeRequiredType) || nodeRequiredType.includes(activeTopicType);
  });

  const handleDeploy = async () => {
    if (!selectedNode) return;

    // 1. Prepare the payload based on whether it's a Live Topic or a ROSbag
    const deploymentConfig = {
      input_topic: sourceType === 'bag' ? selectedSubTopic : selectedSource,
      source_type: sourceType,
      // If it's a bag, we pass the file path so the worker can find it
      bag_path: sourceType === 'bag' ? selectedSource : null,
      // Pass default model from our nodes.json
      model: selectedNode.params.default_model 
    };

    try {
      // 2. Call your FastAPI backend
      const response = await fetch(`http://localhost:8000/start/${selectedNode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deploymentConfig)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`🚀 Deployment Started! Container ID: ${result.id.substring(0, 12)}`);
        // Optional: Reset selection or navigate to "Fleet" tab
      } else {
        const errorData = await response.json();
        alert(`❌ Deployment Failed: ${errorData.detail}`);
      }
    } catch (err) {
      console.error("Network error during deployment:", err);
    }
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
            <button 
              onClick={() => {setSourceType('topic'); setSelectedSource(null); setTopics([]);}}
              className={`flex-1 p-6 rounded-2xl border transition-all text-left ${sourceType === 'topic' ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
            >
              <Radio className={`mb-3 ${sourceType === 'topic' ? 'text-blue-400' : 'text-slate-500'}`} size={20} />
              <p className="text-sm font-bold text-white">Live ROS2 Topic</p>
            </button>
            <button 
              onClick={() => {setSourceType('bag'); setSelectedSource(null); setTopics([]);}}
              className={`flex-1 p-6 rounded-2xl border transition-all text-left ${sourceType === 'bag' ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
            >
              <FileVideo className={`mb-3 ${sourceType === 'bag' ? 'text-blue-400' : 'text-slate-500'}`} size={20} />
              <p className="text-sm font-bold text-white">ROSbag File</p>
            </button>
          </div>

          <div className="bg-slate-950/50 rounded-2xl border border-white/5 min-h-[300px] p-4">
            {sourceType === 'topic' && (
              <div className="space-y-2">
                {topics.map(topic => (
                  <button 
                    key={topic.name}
                    onClick={() => setSelectedSource(topic.name)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedSource === topic.name ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                  >
                    <div className="text-left">
                      <p className="text-xs font-bold font-mono">{topic.name}</p>
                      <p className="text-[10px] opacity-50">{topic.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {sourceType === 'bag' && (
              <div className="space-y-6">
                {!selectedSource ? (
                   <FileBrowser onFileSelect={handleFileSelect} />
                ) : (
                  <div className="space-y-4 animate-in zoom-in-95 duration-200">
                    <button 
                      onClick={() => {setSelectedSource(null); setTopics([]);}}
                      className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-white uppercase font-bold tracking-widest"
                    >
                      <ChevronLeft size={14}/> Change Bag
                    </button>
                    
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Inspecting File</p>
                      <p className="text-xs font-mono text-blue-400 truncate">{selectedSource.split('/').pop()}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Available Internal Topics</label>
                      <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                        {topics.map(t => (
                          <button 
                            key={t.name}
                            onClick={() => setSelectedSubTopic(t.name)}
                            className={`p-3 text-left rounded-xl border transition-all ${selectedSubTopic === t.name ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                          >
                            <p className="text-xs font-bold font-mono">{t.name}</p>
                            <p className="text-[9px] opacity-50 font-mono">{t.type}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!sourceType && (
              <div className="flex items-center justify-center h-[260px] text-slate-600 text-xs italic">
                Select a source type above to begin configuration
              </div>
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
            {compatibleNodes.map(node => (
              <button 
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${selectedNode?.id === node.id ? 'bg-blue-500/10 border-blue-500/40' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
              >
                <div className="p-3 bg-white/5 rounded-xl">{node.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{node.name}</p>
                  <p className="text-[10px] text-slate-500 italic">Compatibility Verified</p>
                </div>
                {selectedNode?.id === node.id && <CheckCircle2 size={18} className="text-blue-400" />}
              </button>
            ))}
          </div>

          <div className="pt-6">
            <button
              onClick={handleDeploy} 
              disabled={!selectedNode}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${selectedNode ? 'bg-white text-black hover:bg-blue-600 shadow-[0_20px_40px_rgba(0,0,0,0.3)]' : 'bg-slate-800 text-slate-600'}`}
            >
              Initialize Deployment <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}