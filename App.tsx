
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  Settings2, 
  RefreshCw,
  X,
  Plus,
  AlertTriangle,
  Layers,
  Type as TypeIcon,
  Rocket,
  CheckCircle2,
  Clock,
  Key,
  Save
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS } from './constants';
import { generatePosterImage, openKeySelector } from './services/gemini';

interface Logo {
  id: string;
  url: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [highQuality, setHighQuality] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isAiStudio, setIsAiStudio] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [manualKey, setManualKey] = useState(localStorage.getItem('CUSTOM_API_KEY') || '');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkKeyStatus = async () => {
      const win = window as any;
      const systemKey = process.env.API_KEY;
      const customKey = localStorage.getItem('CUSTOM_API_KEY');
      
      // เช็กว่ามีคีย์จากแหล่งใดแหล่งหนึ่งหรือไม่
      if ((systemKey && systemKey.trim() !== "") || (customKey && customKey.trim() !== "")) {
        setHasKey(true);
      } else if (win.aistudio && await win.aistudio.hasSelectedApiKey?.()) {
        setHasKey(true);
      } else {
        setHasKey(false);
      }
    };
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const saveManualKey = () => {
    if (manualKey.trim()) {
      localStorage.setItem('CUSTOM_API_KEY', manualKey.trim());
      setShowKeyManager(false);
      setCooldown(0);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (cooldown > 0) return;
    setError(null);
    if (!prompt.trim() && !productImage) {
      setError("กรุณากรอกข้อมูลสินค้า");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt,
        style: STYLE_PRESETS[styleIndex].prompt as any,
        aspectRatio,
        highQuality,
        baseImage: productImage || undefined,
        removeBackground: true,
        posterText
      });

      setCurrentPoster({
        id: Date.now().toString(),
        url: result,
        prompt,
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio,
        timestamp: Date.now()
      });
      setError(null);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("429") || msg.includes("Quota")) {
        setError("โควตาเต็ม (โปรดรอสักครู่หรือเปลี่ยนคีย์)");
        setCooldown(60); 
      } else {
        setError("เกิดข้อผิดพลาด โปรดตรวจสอบคีย์");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async () => {
    if (!currentPoster || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = currentPoster.url;
    await new Promise(r => mainImg.onload = r);

    canvas.width = mainImg.width;
    canvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);

    const logoSize = canvas.width * 0.15;
    let offsetX = 40;
    for (const logo of logos) {
      const logoImg = new Image();
      logoImg.src = logo.url;
      await new Promise(r => logoImg.onload = r);
      const h = logoSize * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - (logoSize + offsetX), 40, logoSize, h);
      offsetX += logoSize + 20;
    }

    const link = document.createElement('a');
    link.download = `poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 flex flex-col font-['Prompt']">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">AI POSTER PRO</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowKeyManager(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            <Key className="w-4 h-4" /> API Key
          </button>
          
          <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full border ${hasKey ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {hasKey ? 'READY' : 'KEY MISSING'}
            </span>
          </div>

          {isAiStudio && (
            <button onClick={openKeySelector} className="p-2.5 bg-white/5 hover:bg-amber-500 hover:text-black rounded-full border border-white/10 transition-all">
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      {showKeyManager && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-[#0a0c10] border border-white/10 rounded-[40px] max-w-lg w-full p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><Key className="text-amber-500" /> ตั้งค่า API Key</h2>
              <button onClick={() => setShowKeyManager(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-slate-400 italic">ถ้า Vercel ไม่ได้ใส่คีย์ไว้ ระบบจะใช้คีย์ที่คุณกรอกด้านล่างนี้แทนครับ</p>
              <input 
                type="password"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="วาง API Key สำรองที่นี่..." 
                className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500/50 transition-all font-mono"
              />
              <button onClick={saveManualKey} className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> บันทึกรหัสสำรอง
              </button>
              <button 
                onClick={() => { localStorage.removeItem('CUSTOM_API_KEY'); setManualKey(''); alert('ลบคีย์สำรองแล้ว'); setShowKeyManager(false); }}
                className="w-full py-2 text-[10px] text-slate-600 font-bold uppercase hover:text-red-400 transition-colors"
              >
                ล้างคีย์สำรอง (กลับไปใช้ Vercel อย่างเดียว)
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto p-4 lg:p-8 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          <div className="glass rounded-[40px] p-6 space-y-6 border border-white/10 shadow-2xl h-[calc(100vh-140px)] overflow-y-auto">
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">โลโก้แบรนด์</label>
              <div className="flex flex-wrap gap-2">
                {logos.map(logo => (
                  <div key={logo.id} className="relative w-12 h-12 bg-white p-1 rounded-xl">
                    <img src={logo.url} className="w-full h-full object-contain" />
                    <button onClick={() => setLogos(l => l.filter(x => x.id !== logo.id))} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"><X className="w-2 h-2 text-white" /></button>
                  </div>
                ))}
                <label className="w-12 h-12 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setLogos(prev => [...prev, { id: Date.now().toString(), url: ev.target?.result as string }]);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <Plus className="w-4 h-4 text-white/20" />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">รูปภาพสินค้า</label>
              <label className="block w-full h-32 border border-white/10 rounded-3xl cursor-pointer relative overflow-hidden bg-black/40">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setProductImage(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                {productImage ? <img src={productImage} className="w-full h-full object-contain p-2" /> : <div className="h-full flex flex-col items-center justify-center opacity-20"><ImageIcon className="w-8 h-8" /></div>}
              </label>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">รายละเอียดโปสเตอร์</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="ชื่อสินค้า/สรรพคุณ..." className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-amber-500/50 h-20" />
              <input type="text" value={posterText} onChange={e => setPosterText(e.target.value)} placeholder="พาดหัวบนภาพ" className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-3 text-xs outline-none focus:border-amber-500/50" />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">การตั้งค่า</label>
              <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="w-full bg-black/80 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none">
                {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
              </select>
              <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-black/80 border border-white/10 rounded-2xl px-4 py-3 text-xs outline-none">
                {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">{error}</span>
              </div>
            )}

            <button 
              onClick={handleGenerate} 
              disabled={isGenerating || (cooldown > 0 && !error)} 
              className="w-full py-5 rounded-[30px] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 transition-all"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : cooldown > 0 ? <Clock className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
              {isGenerating ? 'กำลังสร้าง...' : cooldown > 0 ? `รอ ${cooldown}วิ` : 'สร้างโปสเตอร์'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-white/[0.01] border border-white/5 rounded-[60px] p-8 min-h-[500px] relative">
           {isGenerating ? (
             <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-amber-500 font-black text-[10px] tracking-widest uppercase">AI is Creating...</p>
             </div>
           ) : currentPoster ? (
             <div className="w-full h-full flex flex-col items-center gap-8 animate-in zoom-in duration-300">
               <div className="relative shadow-2xl rounded-[40px] overflow-hidden bg-black border border-white/5">
                 <img src={currentPoster.url} className="max-h-[60vh] w-auto block" />
               </div>
               <button onClick={downloadImage} className="bg-white text-black px-12 py-5 rounded-full font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-xl">
                 <Download className="w-5 h-5" /> ดาวน์โหลด
               </button>
             </div>
           ) : (
             <div className="opacity-20 flex flex-col items-center gap-4">
                <ImageIcon className="w-16 h-16 text-slate-600" />
                <p className="text-[10px] font-black tracking-widest uppercase">Ready to Design</p>
             </div>
           )}
           <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>
    </div>
  );
};

export default App;
