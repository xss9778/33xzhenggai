import React, { useState, useRef, useEffect } from 'react';
import { Marker, RectificationStatus } from '../types';
import { cn } from '../lib/utils';
import { Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface AnnotationCanvasProps {
  imageUrl: string;
  markers: Marker[];
  onMarkersChange: (markers: Marker[]) => void;
  readOnly?: boolean;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageUrl,
  markers,
  onMarkersChange,
  readOnly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly || selectedMarkerId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDrawing(true);
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || readOnly) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setCurrentRect({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      w: Math.abs(currentX - startPos.x),
      h: Math.abs(currentY - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);

    if (currentRect && currentRect.w > 10 && currentRect.h > 10) {
      const newMarker: Marker = {
        id: Math.random().toString(36).substr(2, 9),
        x: (currentRect.x / (containerRef.current?.clientWidth || 1)) * 100,
        y: (currentRect.y / (containerRef.current?.clientHeight || 1)) * 100,
        width: (currentRect.w / (containerRef.current?.clientWidth || 1)) * 100,
        height: (currentRect.h / (containerRef.current?.clientHeight || 1)) * 100,
        status: 'completed'
      };
      onMarkersChange([...markers, newMarker]);
      setSelectedMarkerId(newMarker.id);
    }
    setCurrentRect(null);
  };

  const updateMarkerStatus = (id: string, status: RectificationStatus) => {
    onMarkersChange(markers.map(m => m.id === id ? { ...m, status } : m));
  };

  const deleteMarker = (id: string) => {
    onMarkersChange(markers.filter(m => m.id !== id));
    setSelectedMarkerId(null);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-100 rounded-lg cursor-crosshair select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <img 
        src={imageUrl} 
        alt="Annotate" 
        className="w-full h-full object-contain pointer-events-none"
        referrerPolicy="no-referrer"
      />

      {/* Existing Markers */}
      {markers.map((marker) => (
        <div
          key={marker.id}
          className={cn(
            "absolute border-2 transition-all cursor-pointer",
            marker.status === 'completed' && "border-green-500 bg-green-500/20",
            marker.status === 'needs_improvement' && "border-orange-500 bg-orange-500/20",
            marker.status === 'rectified' && "border-blue-500 bg-blue-500/20",
            selectedMarkerId === marker.id && "ring-2 ring-white ring-offset-2 z-20"
          )}
          style={{
            left: `${marker.x}%`,
            top: `${marker.y}%`,
            width: `${marker.width}%`,
            height: `${marker.height}%`
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMarkerId(marker.id === selectedMarkerId ? null : marker.id);
          }}
        >
          {selectedMarkerId === marker.id && !readOnly && (
            <div className="absolute -top-12 left-0 flex items-center gap-1 bg-white p-1 rounded-lg shadow-lg z-30">
              <button 
                onClick={() => updateMarkerStatus(marker.id, 'completed')}
                className="p-1 hover:bg-green-100 rounded text-green-600"
                title="已完成"
              >
                <Check size={16} />
              </button>
              <button 
                onClick={() => updateMarkerStatus(marker.id, 'needs_improvement')}
                className="p-1 hover:bg-orange-100 rounded text-orange-600"
                title="需改进"
              >
                <AlertCircle size={16} />
              </button>
              <button 
                onClick={() => updateMarkerStatus(marker.id, 'rectified')}
                className="p-1 hover:bg-blue-100 rounded text-blue-600"
                title="已整改"
              >
                <RefreshCw size={16} />
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button 
                onClick={() => deleteMarker(marker.id)}
                className="p-1 hover:bg-red-100 rounded text-red-600"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Current Drawing Rect */}
      {currentRect && (
        <div 
          className="absolute border-2 border-dashed border-brand-blue bg-brand-blue/10 pointer-events-none"
          style={{
            left: currentRect.x,
            top: currentRect.y,
            width: currentRect.w,
            height: currentRect.h
          }}
        />
      )}
    </div>
  );
};
