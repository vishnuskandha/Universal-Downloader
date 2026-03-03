import { useState, useEffect, useCallback } from 'react';
import { Download, Link2, AlertCircle, CheckCircle2, Loader2, Video, Music, Info, ExternalLink, Layers, ClipboardPaste } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeUrl, downloadVideo } from './api';
import FaultyTerminal from './components/FaultyTerminal';

import SpotlightCard from './components/SpotlightCard';
import BatchMode from './components/BatchMode';
import ProfileCard from './components/ProfileCard';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function App() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [mode, setMode] = useState('single'); // 'single' | 'batch'

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setMetadata(null);
    setSelectedFormat('');
    setDownloadSuccess(false);

    try {
      const data = await analyzeUrl(url);
      setMetadata(data);
      // Auto-select a format if possible
      if (data.formats && data.formats.length > 0) {
        const defaultFormat = data.formats.find(f => f.hasVideo && ['1080p', '720p', '480p'].includes(f.resolution)) || data.formats[0];
        setSelectedFormat(defaultFormat.formatId);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to analyze URL");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!metadata || !selectedFormat) return;

    setIsDownloading(true);
    setError(null);
    setDownloadSuccess(false);



    try {
      await downloadVideo(url, selectedFormat, metadata.title || '');
      setDownloadSuccess(true);
      // Auto-dismiss success banner after 4s
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      setError("Failed to download video. Please try again.");
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  // Framer motion variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 px-4 pb-20 sm:pt-24 relative overflow-hidden" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>

      {/* Background - FaultyTerminal */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
        <FaultyTerminal
          scale={2}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.5}
          pause={false}
          scanlineIntensity={0.5}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0.01}
          dither={0.5}
          curvature={0.1}
          tint="#A7EF9E"
          mouseReact={true}
          mouseStrength={0.5}
          pageLoadAnimation={true}
          brightness={0.6}
        />
      </div>



      <motion.div
        className="w-full max-w-3xl flex flex-col items-center space-y-8 z-10 relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-5">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center p-3.5 rounded-2xl mb-2" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 30px rgba(74,222,128,0.15), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            <Download className="w-8 h-8 text-brand-400" />
          </motion.div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight pb-2 drop-shadow-lg bg-gradient-to-r from-white via-brand-400 to-white bg-clip-text text-transparent">
            Universal Downloader
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mx-auto drop-shadow">
            Instantly acquire media from YouTube, Facebook, and Instagram. Modern, fast, and completely free.
          </p>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div variants={itemVariants} className="flex items-center gap-1 p-1" style={{ borderRadius: '14px', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setMode('single')}
            className={`relative px-5 py-2 text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${mode === 'single' ? 'text-dark-900' : 'text-slate-400 hover:text-slate-200'}`}
            style={{ borderRadius: '11px' }}
          >
            {mode === 'single' && (
              <motion.div
                layoutId="modeToggle"
                className="absolute inset-0"
                style={{ borderRadius: '11px', background: 'var(--color-brand-400)', boxShadow: '0 0 16px rgba(74,222,128,0.3)' }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}
            <Download className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Single</span>
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`relative px-5 py-2 text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 ${mode === 'batch' ? 'text-dark-900' : 'text-slate-400 hover:text-slate-200'}`}
            style={{ borderRadius: '11px' }}
          >
            {mode === 'batch' && (
              <motion.div
                layoutId="modeToggle"
                className="absolute inset-0"
                style={{ borderRadius: '11px', background: 'var(--color-brand-400)', boxShadow: '0 0 16px rgba(74,222,128,0.3)' }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}
            <Layers className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Batch</span>
          </button>
        </motion.div>

        {/* Conditional Content */}
        <div className="w-full flex flex-col items-center space-y-8" style={{ display: mode === 'batch' ? 'none' : undefined }}>
          {/* Input Card */}
          <motion.div variants={itemVariants} className="w-full">
            <SpotlightCard className="w-full p-6 sm:p-8" spotlightColor="rgba(74, 222, 128, 0.15)">
              <form onSubmit={handleAnalyze} className="relative z-10 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-400">
                    <Link2 className="w-5 h-5 text-slate-400 group-focus-within:text-brand-400 transition-colors duration-300" />
                  </div>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste video URL here..."
                    disabled={isAnalyzing || isDownloading}
                    className="glass-input w-full h-14 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                  />
                  {/* Clipboard paste shortcut */}
                  {!url && (
                    <button
                      type="button"
                      onClick={async () => { try { const t = await navigator.clipboard.readText(); setUrl(t.trim()); } catch { } }}
                      className="absolute inset-y-0 right-3 flex items-center px-1 text-slate-500 hover:text-brand-400 transition-colors"
                      title="Paste from clipboard"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <motion.button
                  whileHover={!url || isAnalyzing || isDownloading ? {} : { scale: 1.02 }}
                  whileTap={!url || isAnalyzing || isDownloading ? {} : { scale: 0.98 }}
                  type="submit"
                  disabled={!url || isAnalyzing || isDownloading}
                  className="glass-btn h-14 px-8 bg-brand-500 text-dark-900 font-bold overflow-hidden relative tracking-wide disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_30px_rgba(74,222,128,0.6)] border border-brand-400"
                >
                  {/* Shine effect on hover implicitly via Framer, but let's add a CSS shine */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[150%] hover:translate-x-[150%] transition-transform duration-1000"></div>

                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                      <span className="relative z-10">Fetching...</span>
                    </>
                  ) : (
                    <span className="relative z-10">Analyze</span>
                  )}
                </motion.button>
              </form>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-3 backdrop-blur-md">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Disclaimer */}
              <div className="mt-6 flex items-start gap-2 text-xs text-slate-400/80 border-t border-white/5 pt-5">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  By using this service, you agree to comply with copyright laws. We do not host or store any media. Please respect the Terms of Service of all platforms.
                </p>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Results Card */}
          <AnimatePresence>
            {metadata && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-full"
              >
                <SpotlightCard className="w-full p-6 sm:p-8" spotlightColor="rgba(59, 130, 246, 0.15)">
                  <div className="flex flex-col md:flex-row gap-8">

                    {/* Thumbnail & Info */}
                    <div className="w-full md:w-5/12 shrink-0 space-y-5">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="aspect-video overflow-hidden relative group cursor-pointer" style={{ borderRadius: '20px', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                      >
                        {metadata.thumbnailUrl ? (
                          <img
                            src={metadata.thumbnailUrl}
                            alt={metadata.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 bg-dark-800">
                            <Video className="w-12 h-12" />
                          </div>
                        )}

                        {/* Gradient overlay to ensure text legibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

                        <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-lg text-xs font-bold text-white ring-1 ring-white/20 uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <span className="w-2 h-2 rounded-full" style={{ background: metadata.platform === 'youtube' ? '#ff4444' : metadata.platform === 'facebook' ? '#4488ff' : metadata.platform === 'instagram' ? '#e1306c' : '#a0aec0' }} />
                          {metadata.platform}
                        </div>

                        {metadata.durationSeconds > 0 && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-mono font-bold text-white ring-1 ring-white/10 shadow-lg">
                            {Math.floor(metadata.durationSeconds / 60)}:{(metadata.durationSeconds % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                      </motion.div>

                      <h3 className="font-bold text-xl leading-snug line-clamp-2 text-white drop-shadow-md" title={metadata.title}>
                        {metadata.title}
                      </h3>
                    </div>

                    {/* Formats Selection */}
                    <div className="flex-1 space-y-6 flex flex-col">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                            Select Quality
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 max-h-[240px] overflow-y-auto pr-3 custom-scrollbar">
                          <AnimatePresence>
                            {metadata.formats.map((format, index) => (
                              <motion.button
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={format.formatId}
                                type="button"
                                onClick={() => setSelectedFormat(format.formatId)}
                                className={cn(
                                  "glass-format-item relative w-full flex items-center justify-between p-3.5 text-left overflow-hidden group",
                                  selectedFormat === format.formatId && "selected"
                                )}
                              >
                                {selectedFormat === format.formatId && (
                                  <motion.div
                                    layoutId="activeFormat"
                                    className="absolute inset-0 bg-brand-500/5 z-0"
                                    initial={false}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                  />
                                )}

                                <div className="flex items-center gap-4 relative z-10">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors",
                                    selectedFormat === format.formatId ? "bg-brand-500/20 text-brand-300" : "bg-dark-900 text-slate-400 group-hover:text-slate-200"
                                  )}>
                                    {format.hasVideo ? <Video className="w-5 h-5" /> : <Music className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className={cn(
                                      "font-bold text-base transition-colors",
                                      selectedFormat === format.formatId ? "text-brand-300" : "text-slate-200"
                                    )}>
                                      {format.resolution.toUpperCase()} <span className="text-slate-500/80 text-xs ml-1 font-mono">{format.ext.toUpperCase()}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                      {format.label || (format.hasVideo && format.hasAudio ? 'Full Media (Vid+Aud)' : format.hasVideo ? 'Video Component' : 'High Quality Audio')}
                                    </div>
                                  </div>
                                </div>
                                <div className={cn(
                                  "text-sm font-mono font-medium relative z-10 transition-colors",
                                  selectedFormat === format.formatId ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"
                                )}>
                                  {formatSize(format.filesize)}
                                </div>
                              </motion.button>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="pt-5 border-t border-white/10 mt-auto space-y-4">
                        <motion.button
                          whileHover={!selectedFormat || isDownloading ? {} : { scale: 1.02 }}
                          whileTap={!selectedFormat || isDownloading ? {} : { scale: 0.98 }}
                          onClick={handleDownload}
                          disabled={!selectedFormat || isDownloading}
                          className="glass-btn w-full h-14 bg-white text-dark-900 font-extrabold text-lg tracking-wide disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>

                          {isDownloading ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin text-dark-900 relative z-10" />
                              <span className="relative z-10">Processing...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-6 h-6 relative z-10" />
                              <span className="relative z-10">Download Media</span>
                            </>
                          )}
                        </motion.button>

                        {/* Fluid Progress Bar */}
                        <AnimatePresence>
                          {isDownloading && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-3">
                                <div className="relative w-full h-2 overflow-hidden" style={{ borderRadius: '99px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <motion.div
                                    className="absolute inset-y-0 left-0"
                                    style={{
                                      width: '40%',
                                      borderRadius: '99px',
                                      background: 'linear-gradient(90deg, #22c55e, #4ade80, #A7EF9E, #4ade80, #22c55e)',
                                      backgroundSize: '200% 100%',
                                      boxShadow: '0 0 16px rgba(74,222,128,0.5), 0 0 4px rgba(74,222,128,0.8)',
                                    }}
                                    animate={{
                                      x: ['0%', '150%', '0%'],
                                      backgroundPosition: ['0% center', '100% center', '0% center'],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
                                    Extracting and processing media...
                                  </span>
                                  <span className="text-slate-500 font-mono">Please wait</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {downloadSuccess && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="p-3.5 flex items-center justify-center gap-2.5 font-bold text-brand-400"
                              style={{ borderRadius: '16px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', backdropFilter: 'blur(8px)' }}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Download initiated successfully!</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Batch Mode */}
        <div className="w-full" style={{ display: mode === 'single' ? 'none' : undefined }}>
          <BatchMode />
        </div>

      </motion.div>

      {/* Credits — compact info pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '10px 14px',
          pointerEvents: 'auto',
          minWidth: '240px',
        }}
      >
        {/* Left: avatar + text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="https://avatars.githubusercontent.com/u/81701749?s=400&u=0c5c3777387b060aeb6a99df3b779c718bc27f92&v=4"
            alt="Vishnu Skandha"
            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>@VishnuSkandha</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>Open to work</span>
          </div>
        </div>
        {/* Right: button */}
        <button
          onClick={() => window.open('https://vishnuskandhagithubio.vercel.app/', '_blank')}
          style={{
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            background: 'transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'border-color 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = 'rgba(255,255,255,0.4)'; e.target.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.transform = 'translateY(0)'; }}
        >
          Portfolio →
        </button>
      </motion.div>
    </div>
  );
}

export default App;
