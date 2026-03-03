import { useState, useCallback } from 'react';
import { Download, Loader2, CheckCircle2, AlertCircle, X, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeUrl, downloadVideo } from '../api';
import SpotlightCard from './SpotlightCard';

let nextId = 0;
const MAX_CONCURRENT = 3;

export default function BatchMode() {
    const [textInput, setTextInput] = useState('');
    const [queue, setQueue] = useState([]);

    const updateItem = useCallback((id, updates) => {
        setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    }, []);

    const removeItem = (id) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    const processItem = useCallback(async (item, attempt = 0) => {
        updateItem(item.id, { status: 'analyzing' });
        try {
            const data = await analyzeUrl(item.url);
            if (!data || !data.formats || data.formats.length === 0) {
                updateItem(item.id, { status: 'error', error: 'No formats found' });
                return;
            }
            updateItem(item.id, { status: 'downloading', title: data.title || item.url });
            const bestFormat = data.formats[0];
            await downloadVideo(item.url, bestFormat.formatId, data.title || '');
            updateItem(item.id, { status: 'done' });
        } catch (err) {
            const errMsg = err.response?.data?.detail || err.message || 'Download failed';
            // Auto-retry once on server errors (500) — handles transient FFmpeg lock issues
            if (attempt === 0 && (err.response?.status === 500 || err.response?.status === 429)) {
                updateItem(item.id, { status: 'analyzing', error: null, title: item.title + ' (retrying…)' });
                await new Promise(r => setTimeout(r, 3000)); // wait 3s before retry
                return processItem(item, 1);
            }
            updateItem(item.id, { status: 'error', error: errMsg });
        }
    }, [updateItem]);

    const handleStartBatch = useCallback(() => {
        const urls = textInput
            .split('\n')
            .map(u => u.trim())
            .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')));

        if (urls.length === 0) return;

        const newItems = urls.map(url => ({
            id: nextId++,
            url,
            status: 'pending',
            title: url,
            error: null,
        }));

        setQueue(prev => [...prev, ...newItems]);
        setTextInput('');

        // Concurrency pool: MAX_CONCURRENT workers each pull the next item
        const pool = [...newItems];
        let index = 0;

        const runNext = async () => {
            while (index < pool.length) {
                const item = pool[index++];
                await processItem(item);  // await so worker only grabs next after current finishes
            }
        };

        // Spin up workers (at most MAX_CONCURRENT)
        for (let i = 0; i < Math.min(MAX_CONCURRENT, newItems.length); i++) {
            runNext();
        }
    }, [textInput, processItem]);

    const clearCompleted = () => {
        setQueue(prev => prev.filter(item => item.status !== 'done' && item.status !== 'error'));
    };

    const statusIcon = (status) => {
        switch (status) {
            case 'pending': return <div className="w-2 h-2 rounded-full bg-slate-500" />;
            case 'analyzing': return <Loader2 className="w-4 h-4 animate-spin text-brand-400" />;
            case 'downloading': return <Loader2 className="w-4 h-4 animate-spin text-brand-300" />;
            case 'done': return <CheckCircle2 className="w-4 h-4 text-brand-400" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
            default: return null;
        }
    };

    const statusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Queued';
            case 'analyzing': return 'Analyzing...';
            case 'downloading': return 'Downloading...';
            case 'done': return 'Complete ✓';
            case 'error': return 'Failed';
            default: return '';
        }
    };

    const activeCount = queue.filter(i => i.status === 'analyzing' || i.status === 'downloading').length;
    const doneCount = queue.filter(i => i.status === 'done').length;
    const urlCount = textInput.split('\n').filter(u => u.trim().startsWith('http')).length;

    return (
        <div className="w-full space-y-6">
            <SpotlightCard className="w-full p-6 sm:p-8" spotlightColor="rgba(74, 222, 128, 0.15)">
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Layers className="w-4 h-4 text-brand-400" />
                        <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Batch Mode</span>
                        <span className="text-xs text-slate-600 ml-auto">{MAX_CONCURRENT} concurrent max</span>
                    </div>
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={"Paste multiple URLs, one per line...\nhttps://youtube.com/watch?v=...\nhttps://facebook.com/video/...\nhttps://instagram.com/reel/..."}
                        rows={5}
                        className="glass-input w-full p-4 text-white placeholder-slate-500 focus:outline-none resize-none text-sm leading-relaxed"
                    />
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleStartBatch}
                            disabled={!textInput.trim()}
                            className="glass-btn h-12 px-8 bg-brand-500 text-dark-900 font-bold tracking-wide disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_30px_rgba(74,222,128,0.6)] border border-brand-400"
                        >
                            <Download className="w-5 h-5" />
                            <span>Download All</span>
                        </motion.button>
                        <span className={`text-xs transition-colors ${urlCount > 0 ? 'text-brand-400 font-semibold' : 'text-slate-500'}`}>
                            {urlCount} URL{urlCount !== 1 ? 's' : ''} detected
                        </span>
                    </div>
                </div>
            </SpotlightCard>

            <AnimatePresence>
                {queue.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <SpotlightCard className="w-full p-6 sm:p-8" spotlightColor="rgba(74, 222, 128, 0.1)">
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                                        Queue
                                        <span className="text-slate-500 font-mono text-xs normal-case ml-1">
                                            {activeCount > 0 && `${activeCount} active · `}{doneCount}/{queue.length} done
                                        </span>
                                    </h4>
                                    {(doneCount > 0 || queue.some(i => i.status === 'error')) && (
                                        <button onClick={clearCompleted} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                                            Clear completed
                                        </button>
                                    )}
                                </div>

                                {/* Overall progress */}
                                <div className="relative w-full h-1.5 overflow-hidden" style={{ borderRadius: '99px', background: 'rgba(15,23,42,0.6)' }}>
                                    <motion.div
                                        className="absolute inset-y-0 left-0"
                                        style={{
                                            borderRadius: '99px',
                                            background: 'linear-gradient(90deg,#22c55e,#4ade80,#A7EF9E)',
                                            boxShadow: '0 0 12px rgba(74,222,128,0.5)',
                                        }}
                                        animate={{ width: `${(doneCount / queue.length) * 100}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>

                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    <AnimatePresence>
                                        {queue.map((item, index) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20, height: 0 }}
                                                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                                className={`glass-format-item flex items-center gap-3 p-3 ${item.status === 'done' ? 'selected' : ''}`}
                                            >
                                                <div className="shrink-0 w-6 flex items-center justify-center">
                                                    {statusIcon(item.status)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-200 truncate">
                                                        {item.title !== item.url
                                                            ? item.title
                                                            : <span className="text-slate-500 text-xs">{item.url.slice(0, 60)}…</span>
                                                        }
                                                    </div>
                                                    <div className={`text-xs mt-0.5 ${item.status === 'error' ? 'text-red-400' : item.status === 'done' ? 'text-brand-400' : 'text-slate-500'}`}>
                                                        {item.status === 'error' ? item.error : statusLabel(item.status)}
                                                    </div>
                                                </div>
                                                {(item.status === 'done' || item.status === 'error') && (
                                                    <button onClick={() => removeItem(item.id)} className="shrink-0 p-1 text-slate-600 hover:text-slate-300 transition-colors">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {(item.status === 'analyzing' || item.status === 'downloading') && (
                                                    <div className="shrink-0 w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)' }}>
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            style={{ background: 'linear-gradient(90deg,#22c55e,#A7EF9E)', width: '50%' }}
                                                            animate={{ x: ['0%', '100%', '0%'] }}
                                                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                                        />
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
