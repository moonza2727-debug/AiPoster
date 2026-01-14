
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  History, 
  Settings2, 
  RefreshCw,
  X,
  Plus,
  Type,
  Layout,
  ShieldCheck,
  Wand2,
  Check,
  Key,
  AlertTriangle,
  ExternalLink,
  Info
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS, LOADING_MESSAGES } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan, hasApiKey } from './services/gemini';

interface Logo {
  id: string;
  url: string;
  visible: boolean;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [aiSlogans, setAiSlogans] = useState<string[]>([]);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isKeySelected, setIsKeySelected] = useState(false);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ตรวจสอบสถานะ Key ทุก 2 วินาทีเพื่อให้ UI สอดคล้องกับความจริง
  useEffect(() => {
    const checkStatus = async () => {
      const selected = await hasApiKey();
      setIsKeySelected(selected);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: number;
    if (isGenerating) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleOpenKey = async () => {
    setError(null);
    const opened = await openKeySelector();
    if (opened) {
      // Optimistic Update: ถือว่าเชื่อมต่อแล้วทันทีเพื่อให้ผู้ใช้สบายใจ
      setIsKeySelected(true);
    } else {
      setError("ไม่สามารถเปิดหน้าต่างเลือก Key ได้ กรุณาตรวจสอบเบราว์เซอร์หรือรันในสภาพแวดล้อมที่รองรับ");
    }
  };

  const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setProductImage(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogos(prev => [...prev, {
        id: Date.now().toString(),
        url: event.target?.result as string,
        visible: true
      }]);
    };
    reader.readAsDataURL(file);
  };

  const handleAiSlogan = async () => {
    if (!prompt.trim()) {
      setError("กรุณาใส่รายละเอียดสินค้าก่อนเพื่อให้ AI ช่วยคิดคำครับ");
      return;
    }
    setIsSloganLoading(true);
    setError(null);
    try {
      const slogans = await generatePosterSlogan(prompt);
      setAiSlogans(slogans);
    } catch (err: any) {
      if (err.message === "MISSING_KEY") {
        handleOpenKey();
        setError("กรุณาเลือก API Key ก่อนใช้งานครับ");
      } else {
        setError("เกิดข้อผิดพลาดในการคิดคำ");
      }
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    // เช็ค Key อีกครั้งก่อนเริ่ม
    const keyReady = await hasApiKey();
    if (!keyReady) {
      handleOpenKey();
      return;
    }

    if (!prompt.trim() && !productImage) {
      setError("กรุณาอัปโหลดรูปหรือพิมพ์รายละเอียดสินค้าก่อนครับ");
      return;
    }

    setError(null);
    setIsGenerating(true);
    
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Modern commercial product",
        style: STYLE_PRESETS[styleIndex].label as any, 
        aspectRatio,
        highQuality: true,
        baseImage: productImage || undefined,
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
      if (err.message === "MISSING_KEY" || err.message === "KEY_INVALID") {
        setIsKeySelected(false);
        setError("API Key ไม่ถูกต้องหรือยังไม่ได้เลือก กรุณากดปุ่ม 'Connect API Key' อีกครั้งครับ");
        handleOpenKey();
      } else if (err.message?.includes("QUOTA")) {
        setError("โควตาการใช้งานเต็มชั่วคราว กรุณารอ 1 นาทีแล้วลองใหม่ครับ");
      } else {
        setError(err.message || "เกิดข้อผิดพลาดในการเจนภาพ");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async () => {
    if (!currentPoster || !canvasRef.current) return;
    try {
      setIsGenerating(true);
      await renderFinalImage();
      const link = document.createElement('a');
      link.href = canvasRef.current!.toDataURL('image/png', 1.0);
      link.download = `poster-ai-${Date.now()}.png`;
      link.click();
    } catch (err) {
      setError("ไม่สามารถบันทึกรูปได้");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFinalImage = useCallback(async () => {
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
    const padding = canvas.width * 0.05;
    const visibleLogos = logos.filter(l => l.visible);
    
    for (let i = 0; i < visibleLogos.length; i++) {
      const logoImg = new Image();
      logoImg.src = visibleLogos[i].url;
      await new Promise(r => logoImg.onload = r);
      const aspect = logoImg.height / logoImg.width;
      const w = logoSize;
      const h = logoSize * aspect;
      ctx.drawImage(logoImg, canvas.width - ((i + 1) * (w + padding)), padding, w, h);
    }
  }, [currentPoster, logos]);

  return (
    <div className="min-h-screen flex flex-col bg-[#020408] text-slate-200">
      <nav className="glass sticky top-0 z-[100] px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white italic uppercase tracking-tighter">AI <span className="text-amber-500">POSTER PRO</span></h1>
            <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Smart Marketing for Everyone</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleOpenKey}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all text-[10px] font-black uppercase shadow-xl ${
              isKeySelected 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-orange-500 border-orange-600 text-white animate-pulse shadow-orange-500/30'
            }`}
          >
            {isKeySelected ? <ShieldCheck className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
            {isKeySelected ? 'Connected' : 'Connect API Key'}
          </button>
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[420px] flex flex-col gap-6">
          <section className="glass rounded-[35px] p-8 border-white/10 space-y-6">
            <h3 className="text-[10px] font-black text-amber-500 flex items-center gap-3 uppercase tracking-widest border-b border-white/5 pb-4">
              <Layout className="w-4 h-4" /> 01. ข้อมูลสินค้า
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">รูปสินค้าจริง (เพื่อความแม่นยำ)</label>
                <label className="relative flex flex-col items-center justify-center min-h-[140px] w-full bg-slate-900/60 border-2 border-dashed border-white/10 rounded-[25px] cursor-pointer hover:border-amber-500/50 overflow-hidden group transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                  {productImage ? <img src={productImage} className="w-full h-full object-cover" /> : (
                    <div className="text-center opacity-40 group-hover:opacity-100">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <span className="text-[9px] font-black uppercase tracking-widest">คลิกเพื่ออัปโหลด</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">รายละเอียดสินค้า</label>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder="เช่น กาแฟดริปสกัดเย็น หอมกลิ่นภูเขา..." 
                  className="w-full h-24 bg-slate-900/40 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:ring-2 focus:ring-amber-500/50" 
                />
              </div>

              <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-2"><Type className="w-3 h-3" /> ข้อความบนภาพ</span>
                  <button onClick={handleAiSlogan} disabled={isSloganLoading} className="text-[8px] font-black flex items-center gap-1 text-amber-500 hover:text-amber-400 disabled:opacity-30 uppercase tracking-widest">
                    {isSloganLoading ? <RefreshCw className="animate-spin w-3 h-3" /> : <Wand2 className="w-3 h-3" />} AI ช่วยคิด
                  </button>
                </div>
                <input 
                  value={posterText} 
                  onChange={e => setPosterText(e.target.value)} 
                  className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-[11px] outline-none mb-2" 
                  placeholder="พิมพ์ข้อความที่ต้องการ..." 
                />
                {aiSlogans.length > 0 && (
                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-hide">
                    {aiSlogans.map((s, i) => (
                      <button key={i} onClick={() => {setPosterText(s); setCopiedIndex(i); setTimeout(() => setCopiedIndex(null), 1500)}} className="text-[9px] p-2 bg-white/5 rounded-lg text-left hover:bg-white/10 flex justify-between items-center">
                        <span className="truncate pr-2">{s}</span> {copiedIndex === i && <Check className="w-3 h-3 text-amber-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">โลโก้แบรนด์ (อัปโหลดเพิ่มได้)</label>
                <div className="grid grid-cols-4 gap-2">
                  {logos.map(logo => (
                    <div key={logo.id} className="relative aspect-square rounded-xl border border-white/10 bg-white p-1 group">
                      <img src={logo.url} className="w-full h-full object-contain" />
                      <button onClick={() => setLogos(prev => prev.filter(l => l.id !== logo.id))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square flex items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10">
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    <Plus className="w-5 h-5 text-slate-600" />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-[35px] p-8 border-white/10 space-y-6">
            <h3 className="text-[10px] font-black text-amber-500 flex items-center gap-3 uppercase tracking-widest border-b border-white/5 pb-4"><Settings2 className="w-4 h-4" /> 02. สไตล์และสัดส่วน</h3>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((style, idx) => (
                <button 
                  key={style.id} 
                  onClick={() => setStyleIndex(idx)} 
                  className={`text-[9px] py-3 rounded-xl border font-black uppercase transition-all ${styleIndex === idx ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-900/60 border-white/5 text-slate-600 hover:bg-slate-800'}`}
                >
                  {style.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {ASPECT_RATIOS.map(ratio => (
                <button key={ratio.id} onClick={() => setAspectRatio(ratio.id as any)} className={`px-4 py-2 rounded-xl border text-[9px] font-black shrink-0 transition-all ${aspectRatio === ratio.id ? 'bg-white text-black border-white' : 'bg-slate-900/80 text-slate-500 border-white/5'}`}>{ratio.id}</button>
              ))}
            </div>
          </section>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl text-[10px] font-bold flex flex-col gap-2">
              <div className="flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span></div>
              <button onClick={error.includes("Key") ? handleOpenKey : handleGenerate} className="bg-red-500 text-white py-2 rounded-xl text-[9px] font-black uppercase">
                 {error.includes("Key") ? "เลือก API Key ใหม่" : "ลองใหม่อีกครั้ง"}
              </button>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-5 rounded-[30px] flex items-center justify-center gap-4 font-black uppercase transition-all text-[11px] tracking-[0.2em] shadow-2xl relative overflow-hidden group ${
              isGenerating ? 'bg-slate-900 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white active:scale-[0.98]'
            }`}
          >
            {isGenerating ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            <span>{isGenerating ? "AI กำลังสร้างสรรค์..." : "สร้างโปสเตอร์เดี๋ยวนี้"}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="glass rounded-[45px] p-8 min-h-[600px] flex flex-col items-center justify-center border-white/5 relative overflow-hidden shadow-2xl">
            {!isKeySelected && !isGenerating && (
               <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500 max-w-sm">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                     <Key className="w-8 h-8 text-orange-500" />
                  </div>
                  <h4 className="text-white font-black uppercase text-sm tracking-widest">ยังไม่ได้เชื่อมต่อ API Key</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">กรุณากดปุ่ม <span className="text-orange-500 font-bold">Connect API Key</span> ด้านบน และเลือก API Key จากโปรเจกต์ที่ตั้งค่า Billing ไว้แล้วเพื่อเริ่มใช้งาน</p>
                  <button onClick={handleOpenKey} className="px-8 py-3 bg-orange-500 rounded-full text-[10px] font-black uppercase tracking-widest text-white hover:bg-orange-600 transition-all">เชื่อมต่อเดี๋ยวนี้</button>
                  <div className="mt-4 flex items-center gap-2 justify-center text-slate-700">
                    <Info className="w-3 h-3" />
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[9px] hover:underline underline-offset-2">ดูวิธีตั้งค่าการชำระเงิน</a>
                  </div>
               </div>
            )}
            
            {isGenerating ? (
              <div className="text-center space-y-8 z-10 animate-in fade-in duration-500">
                <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin mx-auto shadow-amber-500/20"></div>
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-white italic tracking-wider px-4">{LOADING_MESSAGES[loadingMsgIndex]}</h3>
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em]">Powered by Gemini 2.5 Flash</p>
                </div>
              </div>
            ) : currentPoster ? (
              <div className="w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-1000">
                <div className="relative max-w-full shadow-2xl rounded-[35px] overflow-hidden border border-white/10 bg-black">
                  <canvas ref={canvasRef} className="hidden" />
                  <img src={currentPoster.url} className="max-h-[500px] w-auto transition-transform duration-700" />
                  <div className="absolute top-6 right-6 flex gap-3 drop-shadow-2xl">
                    {logos.filter(l => l.visible).map(l => (
                      <img key={l.id} src={l.url} className="w-12 md:w-16 h-auto object-contain bg-white/20 backdrop-blur-sm p-1 rounded-lg" />
                    ))}
                  </div>
                  {posterText && (
                    <div className="absolute bottom-6 inset-x-0 text-center px-4">
                      <p className="text-white font-black text-xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] italic uppercase tracking-tighter">{posterText}</p>
                    </div>
                  )}
                </div>
                <button onClick={downloadImage} className="bg-white text-black px-12 py-4 rounded-[25px] font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-amber-400 transition-all shadow-xl">
                  <Download className="w-4 h-4" /> Save Final Image
                </button>
              </div>
            ) : isKeySelected && (
              <div className="text-center space-y-6 opacity-30 hover:opacity-50 transition-opacity">
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                   <ImageIcon className="w-16 h-16 text-slate-700" />
                   <div className="absolute inset-0 border-2 border-dashed border-slate-800 rounded-full animate-[spin_30s_linear_infinite]"></div>
                </div>
                <div className="space-y-1">
                  <p className="font-black uppercase tracking-[0.4em] text-[10px] text-white">Creative Studio Canvas</p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500">กรอกข้อมูลทางด้านซ้ายเพื่อเริ่มสร้างสรรค์</p>
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="glass rounded-[35px] p-6 border-white/5">
              <h4 className="text-[9px] font-black text-slate-500 uppercase mb-4 flex items-center gap-3 tracking-[0.2em]"><History className="w-4 h-4 text-amber-500" /> ผลงานล่าสุด</h4>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {history.map(item => (
                  <button key={item.id} onClick={() => setCurrentPoster(item)} className="relative shrink-0">
                     <div className={`rounded-xl overflow-hidden border-2 transition-all ${currentPoster?.id === item.id ? 'border-amber-500 shadow-lg scale-105' : 'border-white/5 opacity-40 hover:opacity-100'}`}>
                        <img src={item.url} className="h-24 w-auto object-cover" />
                     </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-8 text-center opacity-30">
        <p className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.2em]">© 2025 Nan Innovation Hub - Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;
