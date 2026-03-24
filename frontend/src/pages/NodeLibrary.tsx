import { Cpu, Layers, Box, Play, Info, Settings2, Share2 } from 'lucide-react';

export const NODE_TYPES = [
  { 
    id: 'obj_det', 
    name: 'Object Detection', 
    description: 'Real-time 2D bounding box generation for common spatial objects.',
    category: 'Computer Vision',
    icon: <Box className="text-blue-400" />,
    availableWeights: ['YOLOv11n', 'YOLOv11m', 'EfficientDet-Lite0'],
    complexity: 'Medium'
  },
  { 
    id: 'obj_seg', 
    name: 'Instance Segmentation', 
    description: 'Pixel-level masking for precise organic material separation.',
    category: 'Computer Vision',
    icon: <Layers className="text-purple-400" />,
    availableWeights: ['SAM-ViT-B', 'Mask-RCNN', 'YOLOv11-Seg'],
    complexity: 'High'
  },
  { 
    id: 'lidar_proc', 
    name: 'LiDAR Processing', 
    description: 'Point cloud clustering and 3D depth estimation from raw scan data.',
    category: 'Spatial AI',
    icon: <Cpu className="text-emerald-400" />,
    availableWeights: ['PointNet++', 'CenterPoint'],
    complexity: 'Very High'
  }
];

export default function NodeLibrary({ onCreateNode }: { onCreateNode: (node: any) => void }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-bold text-white tracking-tight">Node Repository</h3>
        <p className="text-slate-500 text-sm">Deploy modular perception nodes to your active workstation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {NODE_TYPES.map((node) => (
          <div key={node.id} className="group relative bg-slate-900/40 border border-white/5 rounded-2xl p-6 hover:border-blue-500/50 transition-all flex flex-col h-full">
            
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">
                {node.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white/5 px-2 py-1 rounded">
                {node.complexity}
              </span>
            </div>

            <h4 className="text-lg font-bold text-white mb-2">{node.name}</h4>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">
              {node.description}
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 tracking-tighter border-b border-white/5 pb-2">
                <span>Compatible Weight Sets</span>
                <span>{node.availableWeights.length} Options</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {node.availableWeights.map(w => (
                  <span key={w} className="text-[10px] px-2 py-1 bg-blue-500/5 text-blue-400/80 border border-blue-500/10 rounded">
                    {w}
                  </span>
                ))}
              </div>
            </div>

            <button 
              onClick={() => onCreateNode(node)}
              className="mt-6 w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Play size={14} fill="currentColor" /> Configure & Deploy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}