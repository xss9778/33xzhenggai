import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  History, 
  LayoutGrid, 
  Save, 
  RotateCcw,
  Download, 
  Trash2, 
  ChevronRight, 
  Filter,
  User,
  FolderOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { domToPng } from 'modern-screenshot';

import { Project, RectificationRecord, Marker } from './types';
import { storage } from './services/storage';
import { cn } from './lib/utils';
import { ImageUploader } from './components/ImageUploader';
import { AnnotationCanvas } from './components/AnnotationCanvas';
import { ComparisonSlider } from './components/ComparisonSlider';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('default');
  const [records, setRecords] = useState<RectificationRecord[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'history'>('edit');
  const [comparisonMode, setComparisonMode] = useState<'side' | 'slider'>('side');
  
  // Current Record State
  const [beforeImage, setBeforeImage] = useState<string>('');
  const [afterImage, setAfterImage] = useState<string>('');
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [description, setDescription] = useState<string>('');
  const [rectificationDate, setRectificationDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  // Filters
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const [p, r] = await Promise.all([
      storage.getProjects(),
      storage.getRecords()
    ]);
    setProjects(p);
    setRecords(r);
  };

  const handleSave = async () => {
    if (!beforeImage) return;
    setIsSaving(true);
    
    const project = projects.find(p => p.id === selectedProjectId);
    const newRecord: RectificationRecord = {
      id: editingRecordId || Math.random().toString(36).substr(2, 9),
      projectId: selectedProjectId,
      projectName: project?.name || '未知项目',
      date: new Date().toISOString(),
      rectificationDate,
      beforeImage,
      afterImage: afterImage || '',
      markers,
      description
    };

    await storage.saveRecord(newRecord);
    
    if (editingRecordId) {
      setRecords(records.map(r => r.id === editingRecordId ? newRecord : r));
    } else {
      setRecords([newRecord, ...records]);
    }
    
    setIsSaving(false);
    
    // Reset
    setEditingRecordId(null);
    setBeforeImage('');
    setAfterImage('');
    setMarkers([]);
    setDescription('');
    setRectificationDate(format(new Date(), 'yyyy-MM-dd'));
    setViewMode('history');
  };

  const handleBatchUploadBefore = async (files: FileList) => {
    setIsBatchUploading(true);
    const project = projects.find(p => p.id === selectedProjectId);
    const newRecords: RectificationRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      newRecords.push({
        id: Math.random().toString(36).substr(2, 9),
        projectId: selectedProjectId,
        projectName: project?.name || '未知项目',
        date: new Date().toISOString(),
        rectificationDate: format(new Date(), 'yyyy-MM-dd'),
        beforeImage: base64,
        afterImage: '',
        markers: [],
        description: ''
      });
    }

    for (const record of newRecords) {
      await storage.saveRecord(record);
    }

    setRecords([...newRecords, ...records]);
    setIsBatchUploading(false);
    setViewMode('history');
  };

  const editPendingRecord = (record: RectificationRecord) => {
    setEditingRecordId(record.id);
    setBeforeImage(record.beforeImage);
    setAfterImage(record.afterImage || '');
    setMarkers(record.markers || []);
    setDescription(record.description || '');
    setRectificationDate(record.rectificationDate || format(new Date(), 'yyyy-MM-dd'));
    setSelectedProjectId(record.projectId);
    setViewMode('edit');
  };

  const handleExport = async () => {
    const element = document.getElementById('comparison-container');
    if (!element) return;
    
    setIsExporting(true);
    try {
      // Wait a bit for any pending renders
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await domToPng(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `rectification-${format(new Date(), 'yyyyMMdd-HHmm')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试。错误详情：' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExporting(false);
    }
  };

  const filteredRecords = records.filter(r => {
    if (filterProject !== 'all' && r.projectId !== filterProject) return false;
    if (filterStatus !== 'all') {
      const hasStatus = r.markers.some(m => m.status === filterStatus);
      if (!hasStatus) return false;
    }
    return true;
  });

  const createNewProject = async () => {
    if (!newProjectName.trim()) return;
    
    const newProject = { 
      id: Math.random().toString(36).substr(2, 9), 
      name: newProjectName.trim(), 
      createdAt: new Date().toISOString() 
    };
    await storage.saveProject(newProject);
    setProjects([...projects, newProject]);
    setSelectedProjectId(newProject.id);
    setNewProjectName('');
    setShowNewProjectModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center text-white">
                <LayoutGrid size={18} />
              </div>
              <h1 className="font-bold text-lg tracking-tight text-brand-blue">整改对比管理</h1>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <FolderOpen size={16} className="text-slate-500" />
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-transparent text-sm font-medium focus:outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setShowNewProjectModal(true)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                title="新建项目"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-brand-blue/10 text-brand-blue rounded-lg text-sm font-medium hover:bg-brand-blue/20 transition-all">
                <Plus size={16} />
                批量上传整改前
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => e.target.files && handleBatchUploadBefore(e.target.files)}
                />
              </label>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
              <button 
                onClick={() => {
                  setViewMode('edit');
                  setEditingRecordId(null);
                  setBeforeImage('');
                  setAfterImage('');
                  setMarkers([]);
                  setDescription('');
                }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                  viewMode === 'edit' ? "bg-white text-brand-blue shadow-md scale-105" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <LayoutGrid size={18} />
                工作台
              </button>
              <button 
                onClick={() => setViewMode('history')}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                  viewMode === 'history' ? "bg-white text-brand-blue shadow-md scale-105" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <History size={18} />
                历史记录
              </button>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-900">管理员</p>
                <p className="text-[10px] text-slate-500">xss9778@gmail.com</p>
              </div>
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                <User size={18} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <AnimatePresence mode="wait">
          {viewMode === 'edit' ? (
            <motion.div 
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                      {editingRecordId ? '编辑整改记录' : '新建对比分析'}
                    </h2>
                    <p className="text-slate-400 font-medium mt-1 italic">
                      {editingRecordId ? '完善整改后的信息并保存归档' : '上传前后对比图，标记整改区域'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setBeforeImage('');
                        setAfterImage('');
                        setMarkers([]);
                        setDescription('');
                        setEditingRecordId(null);
                      }}
                      className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
                    >
                      重置工作台
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={!beforeImage || isSaving}
                      className="flex items-center gap-2 px-8 py-2.5 text-sm font-black text-white bg-brand-blue hover:bg-blue-900 rounded-2xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {isSaving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
                      {afterImage ? '保存并归档' : '保存草稿'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                  {/* Main Comparison Area */}
                  <div className="xl:col-span-8 space-y-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button 
                          onClick={() => setComparisonMode('side')}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                            comparisonMode === 'side' ? "bg-brand-blue text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          左右对比
                        </button>
                        <button 
                          onClick={() => setComparisonMode('slider')}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                            comparisonMode === 'slider' ? "bg-brand-blue text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          滑块模式
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setMarkers([])}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="清空标记"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-8">
                    <div id="comparison-container" className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                      {comparisonMode === 'side' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Before / 整改前</span>
                              <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                            </div>
                            <div className="aspect-[4/3] bg-white rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                              <ImageUploader 
                                label="整改前图片" 
                                onImageUpload={setBeforeImage}
                                currentImage={beforeImage}
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                              <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em]">After / 整改后</span>
                              <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse"></div>
                            </div>
                            <div className="aspect-[4/3] bg-white rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative">
                              {afterImage ? (
                                <div className="w-full h-full">
                                  <AnnotationCanvas 
                                    imageUrl={afterImage}
                                    markers={markers}
                                    onMarkersChange={setMarkers}
                                  />
                                </div>
                              ) : (
                                <ImageUploader 
                                  label="整改后图片" 
                                  onImageUpload={setAfterImage}
                                  currentImage={afterImage}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="aspect-[16/9] bg-white rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative">
                            {beforeImage && afterImage ? (
                              <ComparisonSlider beforeImage={beforeImage} afterImage={afterImage} />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                  <LayoutGrid size={32} className="opacity-20" />
                                </div>
                                <p className="text-sm font-bold">请先上传前后对比图以启用滑块模式</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="xl:col-span-4 space-y-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-8 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-6 bg-brand-blue rounded-full"></div>
                      整改详情
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">整改日期</label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="date" 
                            value={rectificationDate}
                            onChange={(e) => setRectificationDate(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">整改内容描述</label>
                        <textarea 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="请输入详细的整改内容及处理结果..."
                          className="w-full h-40 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all resize-none placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button 
                      onClick={handleSave}
                      disabled={!beforeImage || isSaving}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-brand-blue text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-900 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {isSaving ? <Clock size={18} className="animate-spin" /> : <Save size={18} />}
                      {editingRecordId ? '更新记录' : '保存并归档'}
                    </button>

                    <button 
                      onClick={handleExport}
                      disabled={!beforeImage || !afterImage || isExporting}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all disabled:opacity-50 active:scale-95"
                    >
                      {isExporting ? <Clock size={18} className="animate-spin" /> : <Download size={18} />}
                      导出对比图 (PNG)
                    </button>

                    <button 
                      onClick={() => {
                        setEditingRecordId(null);
                        setBeforeImage('');
                        setAfterImage('');
                        setMarkers([]);
                        setDescription('');
                        setRectificationDate(format(new Date(), 'yyyy-MM-dd'));
                      }}
                      className="w-full flex items-center justify-center gap-3 py-3 bg-white text-slate-400 border border-slate-100 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <RotateCcw size={16} />
                      重置当前编辑
                    </button>

                    <p className="text-[10px] text-center text-slate-400 font-medium pt-2">
                      导出图片将包含前后对比、标记、描述及日期
                    </p>
                  </div>
                </div>

                {/* Legend Card */}
                <div className="bg-brand-blue rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200">
                  <h4 className="text-sm font-black uppercase tracking-widest mb-4 opacity-70">标记说明</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-green-400 border-2 border-white shadow-sm"></div>
                      <span className="text-xs font-bold">已完成 - 绿色标记</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-orange-400 border-2 border-white shadow-sm"></div>
                      <span className="text-xs font-bold">需改进 - 橙色标记</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow-sm"></div>
                      <span className="text-xs font-bold">已整改 - 蓝色标记</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Filter size={18} />
                  <span className="text-sm font-medium">筛选:</span>
                </div>
                <select 
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="all">所有项目</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="all">所有状态</option>
                  <option value="completed">已完成</option>
                  <option value="needs_improvement">需改进</option>
                  <option value="rectified">已整改</option>
                </select>
                <div className="ml-auto text-slate-400 text-sm">
                  共 {filteredRecords.length} 条记录
                </div>
              </div>

              {/* Records List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <div key={record.id} className="group bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/30 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                            <CalendarIcon size={20} className="text-brand-blue" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-sm leading-tight">{record.projectName}</h3>
                            <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-0.5">{format(new Date(record.date), 'yyyy.MM.dd HH:mm')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!record.afterImage && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full mr-2 animate-pulse">待整改</span>
                          )}
                          <button 
                            onClick={() => editPendingRecord(record)}
                            className="p-2.5 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition-all"
                            title="继续编辑"
                          >
                            <Plus size={20} />
                          </button>
                          <button 
                            onClick={() => setShowDeleteModal(record.id)}
                            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="删除"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col gap-8">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Before</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                            </div>
                            <div className="aspect-[4/3] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 shadow-inner group-hover:scale-[1.02] transition-transform duration-500">
                              <img src={record.beforeImage} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                              <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em]">After</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-blue"></div>
                            </div>
                            <div className="aspect-[4/3] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 shadow-inner relative group-hover:scale-[1.02] transition-transform duration-500">
                              {record.afterImage ? (
                                <AnnotationCanvas 
                                  imageUrl={record.afterImage}
                                  markers={record.markers}
                                  onMarkersChange={() => {}}
                                  readOnly
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                                  <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                    <Clock size={24} className="opacity-20" />
                                  </div>
                                  <span className="text-[10px] font-black tracking-widest uppercase">等待整改</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="w-1 h-12 bg-slate-100 rounded-full mt-1"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">整改描述</p>
                              <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed">
                                {record.description || "暂无描述内容..."}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">整改日期</p>
                              <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                                <CalendarIcon size={14} className="text-brand-blue" />
                                {record.rectificationDate}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">状态统计</p>
                              <div className="flex flex-wrap gap-1.5">
                                {record.markers.length > 0 ? (
                                  record.markers.reduce((acc: any[], m) => {
                                    const existing = acc.find(a => a.status === m.status);
                                    if (existing) existing.count++;
                                    else acc.push({ status: m.status, count: 1 });
                                    return acc;
                                  }, []).map((stat, i) => (
                                    <span 
                                      key={i}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                                        stat.status === 'completed' && "bg-green-50 text-green-600 border border-green-100",
                                        stat.status === 'needs_improvement' && "bg-orange-50 text-orange-600 border border-orange-100",
                                        stat.status === 'rectified' && "bg-blue-50 text-blue-600 border border-blue-100"
                                      )}
                                    >
                                      {stat.count}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-300 font-bold italic">No Markers</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300 gap-6">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 shadow-inner">
                      <LayoutGrid size={48} className="opacity-10" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-black text-slate-400">暂无整改记录</p>
                      <p className="text-sm font-medium text-slate-300">开始您的第一个整改项目吧</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">确认删除</h3>
                    <p className="text-sm text-slate-500">此操作无法撤销，确定要删除吗？</p>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowDeleteModal(null)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={async () => {
                      if (showDeleteModal) {
                        await storage.deleteRecord(showDeleteModal);
                        setRecords(records.filter(r => r.id !== showDeleteModal));
                        setShowDeleteModal(null);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewProjectModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-brand-blue">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">新建项目</h3>
                    <p className="text-sm text-slate-500">为您的整改记录创建一个新的分类</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">项目名称</label>
                  <input 
                    autoFocus
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createNewProject()}
                    placeholder="例如：2024年度安全整改"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowNewProjectModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={createNewProject}
                    disabled={!newProjectName.trim()}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-brand-blue hover:bg-blue-900 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    确认创建
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
            © 2026 整改对比管理系统 · 专业归档与可视化平台
          </p>
        </div>
      </footer>
    </div>
  );
}
