
import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  History, 
  Settings2, 
  RefreshCw,
  X,
  Plus,
  AlertTriangle,
  Key,
  Layers,
  Maximize2,
  CheckCircle2
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS, LOADING_MESSAGES } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan, hasApiKey } from './services/gemini';

interface Logo {
  id: string;
  url: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [aiSlogans, setAiSlogans] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isKeyReady, setIsKeyReady] = useState(false);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ตรวจสอบสถานะ Key เบื้องต้น
  useEffect(() => {
    const checkStatus = async () => {
      const ok = await hasApiKey();
      if (ok) setIsKeyReady(true);
    };
    checkStatus();
  }, []);

  const handleConnect = async () => {
    try {
      await openKeySelector();
      setIsKeyReady(true); // สมมติว่าสำเร็จตามกฎ Race Condition
      setError(null);
    } catch (e) {
      console.error("Connection error:", e);
    }
  };

  const processLogo = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(url);
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // ลบสีขาว/ใกล้ขาวออก
          if (data[i] > 230 && data[i+1] > 230 && data[i+2] > 230) data[i+3] = 0;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
    });
  };

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProductImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const processed = await processLogo(event.target?.result as string);
      setLogos(prev => [...prev, { id: Date.now().toString(), url: processed }]);
    };
    reader.readAsDataURL(file);
  };

  const handleAiSlogan = async () => {
    if (!prompt.trim()) return;
    setIsSloganLoading(true);
    try {
      const res = await generatePosterSlogan(prompt);
      setAiSlogans(res);
    } catch (e) {
      setError("ไม่สามารถดึงข้อมูลสโลแกนได้");
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!isKeyReady) {
      await handleConnect();
      return;
    }
    
    if (!prompt.trim() && !productImage) {
      setError("กรุณาใส่ชื่อสินค้าหรืออัปโหลดรูปภาพครับ");
      return;
    }
    
    setError(null);
    setIsGenerating(true);
    
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Premium Nan product",
        style: STYLE_PRESETS[styleIndex].label as any, 
        aspectRatio,
        highQuality: true,
        baseImage: productImage || undefined,
        removeBackground,
        posterText: posterText 
      });
      
      const newPoster: GeneratedPoster = {
        id: Date.now().toString(),
        url: result,
        prompt,
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio,
        timestamp: Date.now()
      };
      
      setCurrentPoster(newPoster);
      setHistory(prev => [newPoster, ...prev].slice(0, 10));
    } catch (err: any) {
      console.error("Generation error:", err);
      if (err.message === "MISSING_KEY" || err.message === "KEY_INVALID") {
        setIsKeyReady(false);
        setError("กรุณาเชื่อมต่อ API Key ใหม่อีกครั้งครับ (แนะนำใช้ Key จากโปรเจกต์ที่ผูกบัตร)");
        handleConnect();
      } else {
        setError(err.message || "เกิดข้อผิดพลาดในการสร้างภาพ");
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
    mainImg.src = currentPoster.url;
    await new Promise(r => mainImg.onload = r);
    canvas.width = mainImg.width;
    canvas.height = mainImg.height;
    ctx.drawImage(mainImg, 0, 0);

    // วาดโลโก้
    const logoSize = canvas.width * 0.15;
    for (let i = 0; i < logos.length; i++) {
      const logoImg = new Image();
      logoImg.src = logos[i].url;
      await new Promise(r => logoImg.onload = r);
      const h = logoSize * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - (logoSize + 40), 40 + (i * (h + 20)), logoSize, h);
    }

    // วาดข้อความ
    if (posterText) {
      ctx.font = `bold ${canvas.width * 0.08}px Prompt`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 20;
      ctx.fillText(posterText.toUpperCase(), canvas.width / 2, canvas.height - 80);
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `nan-poster-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 flex flex-col font-['Prompt']">
      <nav className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-500/20"><Sparkles className="w-5 h-5 text-black" /></div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">AI POSTER <span className="bg-amber-500/10 px-2 py-0.5 rounded text-[10px] text-amber-500 border border-amber-500/20">PRO</span></h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Nan Provincial Smart Branding</p>
          </div>
        </div>
        
        <button 
          onClick={handleConnect} 
          className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase flex items-center gap-2 transition-all shadow-xl ${isKeyReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-600 text-white animate-pulse'}`}
        >
          {isKeyReady ? <CheckCircle2 className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          {isKeyReady ? 'เชื่อมต่อระบบแล้ว' : 'คลิกเพื่อเชื่อมต่อระบบ'}
        </button>
      </nav>

      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[420px] flex flex-col gap-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 space-y-8 shadow-2xl backdrop-blur-sm">
            
            {/* 01. Upload Product */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2"><Layers className="w-4 h-4" /> 01. รูปสินค้า</h3>
                <button onClick={() => setRemoveBackground(!removeBackground)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${removeBackground ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                  {removeBackground ? 'ตัดพื้นหลัง' : 'ใช้พื้นเดิม'}
                </button>
              </div>
              <label className="border-2 border-dashed border-white/10 rounded-[30px] h-48 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 transition-all overflow-hidden bg-black/40 group relative">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? <img src={productImage} className="w-full h-full object-contain p-4" /> : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-amber-500 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">เลือกรูปสินค้า</p>
                  </div>
                )}
              </label>
            </section>

            {/* 02. Aspect Ratio */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2"><Maximize2 className="w-4 h-4" /> 02. เลือกขนาด</h3>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button 
                    key={ratio.id} 
                    onClick={() => setAspectRatio(ratio.id as any)}
                    className={`px-3 py-2.5 rounded-xl border text-[10px] font-black transition-all ${aspectRatio === ratio.id ? 'bg-white text-black border-white shadow-xl scale-105' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                  >
                    {ratio.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </section>

            {/* 03. Product Info */}
            <section className="space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">03. รายละเอียด & สโลแกน</span>
                 <button onClick={handleAiSlogan} disabled={isSloganLoading} className="text-[10px] text-amber-500 font-bold hover:underline">AI ช่วยคิด</button>
               </div>
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="เช่น กาแฟดริปเมืองน่าน หอมกลิ่นป่าเขาสก..."
                  className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-amber-500/50 h-24 transition-all resize-none"
                />
                {aiSlogans.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {aiSlogans.map((s, i) => (
                      <button key={i} onClick={() => setPosterText(s)} className="text-[9px] bg-white/5 px-2 py-1 rounded-lg border border-white/5 hover:border-amber-500/50 transition-all active:scale-95">{s}</button>
                    ))}
                  </div>
                )}
                <input 
                  type="text" 
                  value={posterText} 
                  onChange={e => setPosterText(e.target.value)}
                  placeholder="คำพาดหัวในภาพ..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500/50"
                />
            </section>

            {/* 04. Styles */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2"><Settings2 className="w-4 h-4" /> 04. เลือกสไตล์ฉากหลัง</h3>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map((style, i) => (
                  <button key={i} onClick={() => setStyleIndex(i)} className={`text-[10px] p-3 rounded-2xl border transition-all font-bold ${styleIndex === i ? 'bg-amber-500 text-black border-amber-500 shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                    {style.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 05. Logo Upload (Re-added) */}
            <section className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">05. โลโก้แบรนด์</h3>
              <div className="flex gap-3 flex-wrap">
                {logos.map(l => (
                  <div key={l.id} className="relative w-14 h-14 bg-white/10 rounded-2xl p-2 group border border-white/10">
                    <img src={l.url} className="w-full h-full object-contain" />
                    <button onClick={() => setLogos(prev => prev.filter(x => x.id !== l.id))} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-14 h-14 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <Plus className="w-6 h-6 text-slate-600 group-hover:text-amber-500 transition-colors" />
                </label>
              </div>
            </section>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl flex gap-3 items-center animate-in fade-in duration-300">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-[10px] text-red-400 font-black uppercase tracking-wider leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-5 rounded-[30px] font-black text-sm flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-50 ${isKeyReady ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-orange-600/20' : 'bg-orange-600 text-white animate-bounce'}`}
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGenerating ? 'AI กำลังเนรมิตภาพ...' : isKeyReady ? 'เนรมิตโปสเตอร์สินค้า' : 'กรุณาเชื่อมต่อระบบก่อน'}
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-[60px] flex-1 min-h-[600px] relative overflow-hidden flex flex-col items-center justify-center shadow-inner group">
            {isGenerating ? (
              <div className="text-center space-y-8 p-12 animate-in fade-in duration-500">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-black text-white italic uppercase tracking-widest">{LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]}</p>
                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.5em] font-bold">Powered by Gemini AI</p>
                </div>
              </div>
            ) : currentPoster ? (
              <div className="relative flex flex-col items-center animate-in zoom-in duration-500 w-full p-4 lg:p-12">
                <canvas ref={canvasRef} className="hidden" />
                <div className="relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] rounded-[40px] overflow-hidden border border-white/10 bg-black">
                  <img src={currentPoster.url} className="max-h-[650px] w-auto block" alt="Generated Poster" />
                  
                  {/* Logo Overlays */}
                  <div className="absolute top-8 right-8 flex flex-col gap-4">
                    {logos.map(l => (
                      <img key={l.id} src={l.url} className="w-16 h-16 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
                    ))}
                  </div>

                  {/* Heading Overlay */}
                  {posterText && (
                    <div className="absolute bottom-12 inset-x-0 text-center px-10">
                      <p className="text-white text-4xl lg:text-5xl font-black italic drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] uppercase leading-none tracking-tighter">
                        {posterText}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-4 mt-12">
                  <button onClick={downloadImage} className="bg-white text-black px-12 py-4 rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-amber-400 transition-all shadow-2xl active:scale-95">
                    <Download className="w-5 h-5" /> บันทึกโปสเตอร์ลงเครื่อง
                  </button>
                  <button onClick={() => {setCurrentPoster(null); setError(null);}} className="bg-white/5 text-white p-4 rounded-full hover:bg-white/10 border border-white/10 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-10">
                <ImageIcon className="w-32 h-32 text-white mx-auto mb-10" />
                <p className="text-xs uppercase font-black tracking-[1em] text-white">พร้อมเนรมิตผลงาน</p>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white/[0.03] border border-white/5 rounded-[45px] p-8 shadow-inner">
              <h4 className="text-[10px] font-black text-slate-600 uppercase mb-6 flex items-center gap-2 tracking-[0.3em]"><History className="w-4 h-4 text-amber-500" /> ผลงานล่าสุด</h4>
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide">
                {history.map(h => (
                  <button 
                    key={h.id} 
                    onClick={() => setCurrentPoster(h)} 
                    className={`shrink-0 transition-all duration-300 rounded-2xl overflow-hidden border-2 ${currentPoster?.id === h.id ? 'scale-110 border-amber-500 shadow-xl' : 'opacity-30 border-transparent hover:opacity-100'}`}
                  >
                    <img src={h.url} className="h-24 w-auto object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-10 text-center border-t border-white/5 opacity-30">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em]">© 2025 Nan Provincial Smart Branding Engine</p>
      </footer>
    </div>
  );
};

export default App;
