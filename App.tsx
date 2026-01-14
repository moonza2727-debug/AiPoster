
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Image as ImageIcon, Download, RefreshCw, X, Plus,
  Rocket, Layout, Wand2, Scissors, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { removeBackground } from "@imgly/background-removal";
import { AspectRatio, GeneratedPoster, PosterStyle } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS } from './constants';
import { generatePosterImage, testConnection } from './services/gemini';

interface Logo { id: string; url: string; }

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('OTOP น่าน พรีเมียม');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    testConnection().then(res => {
      if (!res.valid) {
        console.warn("API Key might be invalid or restricted:", res.error);
      }
    });
  }, []);

  const handleRemoveBackground = async () => {
    if (!productImage) return;
    setIsRemovingBg(true);
    try {
      const blob = await removeBackground(productImage);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result as string);
        setIsRemovingBg(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      alert("ขออภัย ระบบลบพื้นหลังขัดข้อง กรุณาลองใหม่ครับ");
      setIsRemovingBg(false);
    }
  };

  const handleGenerate = async () => {
    if (!productImage && !prompt.trim()) {
      alert("กรุณาอัปโหลดรูปสินค้าหรือพิมพ์รายละเอียดฉากที่ต้องการครับ");
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const result = await generatePosterImage({
        prompt,
        style: STYLE_PRESETS[styleIndex].label,
        aspectRatio,
        highQuality: true,
        posterText
      });
      setCurrentPoster({
        id: Date.now().toString(),
        url: result,
        prompt,
        style: STYLE_PRESETS[styleIndex].label,
        aspectRatio,
        timestamp: Date.now()
      });
    } catch (err: any) {
      console.error("Generation failed:", err);
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
      alert("เกิดข้อผิดพลาดในการสร้างภาพ: " + (err.message || "กรุณาลองใหม่อีกครั้งครับ"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `OTOP-Nan-Poster-${Date.now()}.png`;
    link.href = previewUrl;
    link.click();
  };

  const drawToCanvas = async () => {
    if (!currentPoster || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.src = currentPoster.url;
    await new Promise((r) => bgImg.onload = r);

    canvas.width = bgImg.width;
    canvas.height = bgImg.height;

    // 1. Draw Background
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    
    // 2. Subtle shadow gradient at bottom
    const bottomGrad = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
    bottomGrad.addColorStop(0, 'transparent');
    bottomGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

    // 3. Draw Product (Grounded at bottom)
    if (productImage) {
      const prodImg = new Image();
      prodImg.src = productImage;
      await new Promise(r => prodImg.onload = r);
      
      const scale = Math.min((canvas.width * 0.75) / prodImg.width, (canvas.height * 0.75) / prodImg.height);
      const w = prodImg.width * scale;
      const h = prodImg.height * scale;
      const x = (canvas.width - w) / 2;
      // วางสินค้าให้ชิดขอบล่างมากขึ้น (ขยับขึ้นจากขอบนิดเดียวเพื่อความสวยงาม)
      const y = canvas.height - h - (canvas.height * 0.08);

      ctx.save();
      // Contact Shadow (เงาใต้สินค้า)
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height - (canvas.height * 0.08), w * 0.45, h * 0.04, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 25;
      ctx.shadowColor = "black";
      ctx.fill();

      // Product Image
      ctx.shadowBlur = 50;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowOffsetY = 15;
      ctx.drawImage(prodImg, x, y, w, h);
      ctx.restore();
    }

    // 4. Draw Logos (Top Right)
    const logoSize = canvas.width * 0.16;
    let lX = canvas.width - logoSize - (canvas.width * 0.04);
    let lY = canvas.height * 0.04;

    for (const logo of logos) {
      const lImg = new Image();
      lImg.src = logo.url;
      await new Promise(r => lImg.onload = r);
      ctx.save();
      ctx.beginPath();
      ctx.arc(lX + logoSize/2, lY + logoSize/2, logoSize/2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.drawImage(lImg, lX, lY, logoSize, logoSize);
      ctx.restore();
      
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 4;
      ctx.stroke();
      lX -= (logoSize + 15);
    }

    // 5. Draw Footer Text (Bottom Layer - safe from logos)
    if (posterText.trim()) {
      ctx.save();
      const fontSize = canvas.width * 0.075;
      const textY = canvas.height * 0.94;
      
      // Text Background Bar (Semi-transparent dark)
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      const barH = fontSize * 1.6;
      ctx.fillRect(0, textY - barH/1.5, canvas.width, barH);
      
      // Decorative gold lines
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(0, textY - barH/1.5, canvas.width, 2);
      ctx.fillRect(0, textY + barH/3, canvas.width, 2);

      ctx.font = `700 ${fontSize}px "Prompt"`;
      ctx.textAlign = "center";
      
      // Text Shadow
      ctx.shadowBlur = 12;
      ctx.shadowColor = "black";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Gradient Text
      const tGrad = ctx.createLinearGradient(0, textY - fontSize/2, 0, textY + fontSize/2);
      tGrad.addColorStop(0, '#ffffff');
      tGrad.addColorStop(0.6, '#fbbf24');
      tGrad.addColorStop(1, '#f59e0b');
      
      ctx.fillStyle = tGrad;
      ctx.fillText(posterText, canvas.width / 2, textY);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    if (currentPoster) {
      const timer = setTimeout(() => {
        drawToCanvas().then(url => setPreviewUrl(url));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPoster, posterText, logos, productImage, styleIndex]);

  return (
    <div className="min-h-screen bg-[#02050a] text-slate-200 flex flex-col font-['Prompt']">
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-3xl sticky top-0 z-50 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 rounded-2xl shadow-lg animate-pulse">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic text-white tracking-tighter">OTOP <span className="text-amber-500">PRO</span></h1>
            <p className="text-[10px] text-amber-500/50 font-bold uppercase tracking-[0.3em]">AI Nan Creative Studio</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-white/5 rounded-full border border-white/10">
           <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${errorMsg ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
           <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
             {errorMsg ? 'API Connection Error' : 'System Operational'}
           </span>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 grid lg:grid-cols-12 gap-8 max-w-7xl">
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
          <div className="bg-slate-900/50 border border-white/10 rounded-[40px] p-8 space-y-8 shadow-3xl backdrop-blur-2xl">
            
            <section className="space-y-4">
              <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> แบรนด์โลโก้
              </label>
              <div className="flex flex-wrap gap-4">
                {logos.map(logo => (
                  <div key={logo.id} className="relative w-16 h-16 bg-white rounded-full p-1 border-2 border-amber-500 shadow-xl group overflow-hidden">
                    <img src={logo.url} className="w-full h-full object-contain rounded-full" />
                    <button onClick={() => setLogos(l => l.filter(x => x.id !== logo.id))} className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 border-2 border-dashed border-white/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-500/10 hover:border-amber-500/40 transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setLogos(prev => [...prev, { id: Date.now().toString(), url: ev.target?.result as string }]);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <Plus className="w-8 h-8 text-slate-700" />
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> สินค้า OTOP
              </label>
              <div className={`relative w-full h-64 border-2 border-dashed border-white/5 rounded-[36px] overflow-hidden bg-black/40 group ${isRemovingBg ? 'scanning' : ''}`}>
                {productImage ? (
                  <>
                    <img src={productImage} className={`w-full h-full object-contain p-8 transition-all ${isRemovingBg ? 'opacity-20 blur-xl' : ''}`} />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={handleRemoveBackground} disabled={isRemovingBg} className="bg-amber-500 text-black px-5 py-3 rounded-2xl text-[11px] font-bold flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                        {isRemovingBg ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5" />}
                        ลบพื้นหลัง
                      </button>
                      <button onClick={() => setProductImage(null)} className="bg-black/80 text-white p-3 rounded-2xl hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="h-full w-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setProductImage(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <ImageIcon className="w-12 h-12 opacity-10 mb-4" />
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">อัปโหลดรูปสินค้าที่นี่</p>
                  </label>
                )}
              </div>
            </section>

            <section className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ชื่อสินค้า / พาดหัว</label>
                <input type="text" value={posterText} onChange={e => setPosterText(e.target.value)} placeholder="เช่น สารสนเทศ สพจ.น่าน" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-amber-500/40 text-white transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ฉากที่ต้องการ</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="เช่น ฉากน้ำตกหรูหรา, ลายกนกสีเขียวทอง" className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm outline-none focus:border-amber-500/40 h-24 resize-none text-white transition-all shadow-inner" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">สไตล์ฉาก</p>
                  <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-4 text-[11px] font-bold uppercase cursor-pointer outline-none hover:bg-slate-700 transition-colors">
                    {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">สัดส่วน</p>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-4 text-[11px] font-bold uppercase cursor-pointer outline-none hover:bg-slate-700 transition-colors">
                    {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <button onClick={handleGenerate} disabled={isGenerating || isRemovingBg} className="group relative w-full py-6 rounded-[30px] font-bold text-xs uppercase tracking-[0.4em] overflow-hidden transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-amber-500/20">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 bg-[length:200%_100%] animate-shimmer"></div>
              <div className="relative flex items-center justify-center gap-3 text-black">
                {isGenerating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
                {isGenerating ? 'กำลังสร้างผลงาน...' : 'เริ่มสร้างโปสเตอร์'}
              </div>
            </button>
            
            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-[10px] text-red-400 font-medium">ERROR: {errorMsg}</p>
              </div>
            )}
          </div>
        </div>

        {/* Output Preview */}
        <div className="lg:col-span-8 bg-[#010206] rounded-[60px] border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-12 shadow-[inset_0_0_200px_rgba(0,0,0,1)]">
           {isGenerating ? (
             <div className="text-center">
                <div className="w-32 h-32 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin mx-auto mb-10 shadow-xl shadow-amber-500/10"></div>
                <h3 className="text-amber-500 font-bold text-3xl tracking-[0.6em] uppercase animate-pulse">CREATING...</h3>
                <p className="text-slate-600 text-[11px] uppercase mt-4 tracking-widest">AI กำลังรังสรรค์พื้นหลังระดับสตูดิโอให้คุณ</p>
             </div>
           ) : previewUrl ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-12 animate-in fade-in zoom-in duration-1000">
               <div className="relative shadow-[0_120px_250px_rgba(0,0,0,1)] rounded-[52px] overflow-hidden border border-white/10 max-w-full max-h-[75vh]">
                 <img src={previewUrl} className="max-h-full w-auto block rounded-[48px]" alt="Final Poster" />
               </div>
               <div className="flex gap-6">
                 <button onClick={handleDownload} className="bg-white text-black px-16 py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.4em] flex items-center gap-4 hover:bg-amber-400 transition-all shadow-3xl active:scale-95">
                   <Download className="w-6 h-6" /> DOWNLOAD
                 </button>
                 <button onClick={() => { setCurrentPoster(null); setPreviewUrl(null); }} className="bg-white/5 text-white/30 px-8 py-6 rounded-[32px] font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10">
                   เริ่มใหม่
                 </button>
               </div>
             </div>
           ) : (
             <div className="text-center opacity-10">
                <Layout className="w-64 h-64 mx-auto mb-8 text-white" />
                <p className="text-[24px] font-black tracking-[1.5em] text-white">STUDIO READY</p>
             </div>
           )}
           <canvas ref={canvasRef} className="hidden" />
           {/* Decor Glows */}
           <div className="absolute top-[-30%] left-[-20%] w-[100%] h-[100%] bg-amber-500/[0.04] rounded-full blur-[300px] pointer-events-none"></div>
           <div className="absolute bottom-[-30%] right-[-20%] w-[100%] h-[100%] bg-blue-500/[0.02] rounded-full blur-[300px] pointer-events-none"></div>
        </div>
      </main>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .animate-shimmer { animation: shimmer 4s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .scanning::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: #f59e0b; box-shadow: 0 0 30px #f59e0b; animation: scan 2s linear infinite;
        }
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(400%); } }
      `}</style>
    </div>
  );
};

export default App;
