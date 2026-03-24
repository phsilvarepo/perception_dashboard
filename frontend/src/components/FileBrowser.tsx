import { Folder, FileText, ChevronLeft, HardDrive, Search } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  is_bag: boolean;
  size?: string;
}

export default function FileBrowser({ onFileSelect }: { onFileSelect: (path: string) => void }) {
  const [currentPath, setCurrentPath] = useState('/home'); // Adjust to your start path
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/explore?path=${encodeURIComponent(currentPath)}`)
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Discovery error:", err);
        setLoading(false);
      });
  }, [currentPath]);

  const goBack = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath('/' + parts.join('/'));
  };

  return (
    <div className="bg-slate-950/50 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[350px] animate-in fade-in zoom-in-95">
      {/* EXPLORER HEADER */}
      <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={goBack}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18}/>
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">System Explorer</span>
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">{currentPath}</span>
          </div>
        </div>
        <HardDrive size={16} className="text-slate-700" />
      </div>

      {/* ITEM LIST */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs font-mono animate-pulse">
            Scanning blocks...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {items.map(item => (
              <button
                key={item.path}
                onClick={() => item.is_dir ? setCurrentPath(item.path) : (item.is_bag && onFileSelect(item.path))}
                className={`group w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${
                  item.is_dir 
                    ? 'hover:bg-white/5 border-transparent text-slate-300' 
                    : item.is_bag 
                    ? 'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/40 text-blue-400' 
                    : 'opacity-20 grayscale cursor-not-allowed border-transparent text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  {item.is_dir ? (
                    <Folder size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                  ) : (
                    <FileText size={16} className={item.is_bag ? "text-blue-400" : "text-slate-500"} />
                  )}
                  <span className="text-xs font-medium truncate">{item.name}</span>
                </div>
                {item.is_bag && (
                   <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300">
                     Rosbag
                   </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}