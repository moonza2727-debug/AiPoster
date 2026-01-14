
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Image as ImageIcon, Download, RefreshCw, X, Plus,
  Rocket, Layout, Wand2, Scissors, CheckCircle2
} from 'lucide-react';
import { removeBackground } from "@imgly/background-removal";
import { AspectRatio, GeneratedPoster, PosterStyle } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS } from './constants';
import { generatePosterImage, testConnection } from './services/gemini';

interface Logo { id: string; url: string; }

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('OTOP พรีเมียม');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    testConnection().catch(err => console.error("Initial check failed", err));
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
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการสร้างภาพ กรุณาลองใหม่อีกครั้งครับ");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `OTOP-Poster-${Date.now()}.png`;
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
    
    // 2. Add a subtle dark gradient at the bottom for grounding
    const bottomGrad = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
    bottomGrad.addColorStop(0, 'transparent');
    bottomGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);

    // 3. Draw Product Image (Sitting on the floor line)
    if (productImage) {
      const prodImg = new Image();
      prodImg.src = productImage;
      await new Promise(r => prodImg.onload = r);
      
      const scale = Math.min((canvas.width * 0.7) / prodImg.width, (canvas.height * 0.7) / prodImg.height);
      const w = prodImg.width * scale;
      const h = prodImg.height * scale;
      const x = (canvas.width - w) / 2;
      // Position the base of the product at 85% height to look grounded
      const y = (canvas.height * 0.88) - h;

      ctx.save();
      // Ground Shadow (Contact Shadow)
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height * 0.88, w * 0.4, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "black";
      ctx.fill();

      // Product Shadow (Ambient Occlusion)
      ctx.shadowBlur = 40;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowOffsetY = 10;
      ctx.drawImage(prodImg, x, y, w, h);
      ctx.restore();
    }

    // 4. Draw Footer Text (Moved to bottom to avoid Logo)
    if (posterText.trim()) {
      ctx.save();
      const centerY = canvas.height * 0.92;
      const fontSize = canvas.width * 0.07;
      
      // Decorative bar behind text
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      const barH = fontSize * 1.5;
      ctx.fillRect(0, centerY - barH/2, canvas.width, barH);
      
      // Top/Bottom Accent lines for the text bar
      ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY - barH/2);
      ctx.lineTo(canvas.width, centerY - barH/2);
      ctx.moveTo(0, centerY + barH/2);
      ctx.lineTo(canvas.width, centerY + barH/2);
      ctx.stroke();

      ctx.font = `700 ${fontSize}px "Prompt"`;
      ctx.textAlign = "center";
      
      // Gradient Text for visibility
      const tGrad = ctx.createLinearGradient(0, centerY - fontSize/2, 0, centerY + fontSize/2);
      tGrad.addColorStop(0, '#ffffff');
      tGrad.addColorStop(1, '#fbbf24');
      
      ctx.shadowBlur = 8;
      ctx.shadowColor = "black";
      ctx.fillStyle = tGrad;
      ctx.fillText(posterText, canvas.width / 2, centerY + fontSize/3);
      ctx.restore();
    }

    // 5. Draw Logos (Top Right - remains safe as text is now at the bottom)
    const logoSize = canvas.width * 0.16;
    let lX = canvas.width - logoSize - (canvas.width * 0.05);
    let lY = canvas.height * 0.05;

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
      
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.stroke();
      lX -= (logoSize + 15);
    }

    return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    if (currentPoster) {
      const timer = setTimeout(() => {
        drawToCanvas().then(url => setPreviewUrl(url));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentPoster, posterText, logos, productImage, styleIndex]);

  return (
    <div className="min-h-screen bg-[#02050a] text-slate-200 flex flex-col font-['Prompt']">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 rounded-2xl shadow-lg">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic text-white tracking-tighter">OTOP <span className="text-amber-500">PRO</span></h1>
            <p className="text-[10px] text-amber-500/50 font-bold uppercase tracking-[0.3em]">AI Creative Studio</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Engine Ready</span>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 grid lg:grid-cols-12 gap-8 max-w-7xl">
        {/* Controls Section */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
          <div className="bg-slate-900/40 border border-white/10 rounded-[40px] p-8 space-y-8 shadow-3xl backdrop-blur-xl">
            
            <section className="space-y-4">
              <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> โลโก้แบรนด์
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
                <ImageIcon className="w-4 h-4" /> รูปสินค้า
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
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">คลิกเพื่ออัปโหลดสินค้า</p>
                  </label>
                )}
              </div>
            </section>

            <section className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">พาดหัว (จะอยู่ด้านล่าง)</label>
                <input type="text" value={posterText} onChange={e => setPosterText(e.target.value)} placeholder="เช่น สารสนเทศ สพจ.น่าน" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-amber-500/40 text-white transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">รายละเอียดฉาก</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="เช่น ฉากน้ำตกหรูหรา, ลายกนกสีเขียวทอง" className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm outline-none focus:border-amber-500/40 h-24 resize-none text-white transition-all shadow-inner" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">สไตล์</p>
                  <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-4 text-[11px] font-bold uppercase cursor-pointer outline-none">
                    {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ขนาด</p>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-4 text-[11px] font-bold uppercase cursor-pointer outline-none">
                    {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <button onClick={handleGenerate} disabled={isGenerating || isRemovingBg} className="group relative w-full py-6 rounded-[30px] font-bold text-xs uppercase tracking-[0.4em] overflow-hidden transition-all active:scale-95 disabled:opacity-50">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 bg-[length:200%_100%] animate-shimmer"></div>
              <div className="relative flex items-center justify-center gap-3 text-black">
                {isGenerating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Rocket className="w-6 h-6" />}
                เริ่มสร้างโปสเตอร์
              </div>
            </button>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-8 bg-[#010206] rounded-[60px] border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-12 shadow-[inset_0_0_150px_rgba(0,0,0,1)]">
           {isGenerating ? (
             <div className="text-center">
                <div className="w-32 h-32 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin mx-auto mb-10 shadow-xl shadow-amber-500/10"></div>
                <h3 className="text-amber-500 font-bold text-2xl tracking-[0.5em] uppercase animate-pulse">CREATING MAGIC...</h3>
             </div>
           ) : previewUrl ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-12 animate-in fade-in zoom-in duration-700">
               <div className="relative shadow-[0_100px_200px_rgba(0,0,0,1)] rounded-[48px] overflow-hidden border border-white/10 max-w-full max-h-[75vh]">
                 <img src={previewUrl} className="max-h-full w-auto block rounded-[44px]" alt="Poster Output" />
               </div>
               <div className="flex gap-6">
                 <button onClick={handleDownload} className="bg-white text-black px-16 py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-amber-500 transition-all shadow-3xl active:scale-95">
                   <Download className="w-6 h-6" /> DOWNLOAD
                 </button>
                 <button onClick={() => { setCurrentPoster(null); setPreviewUrl(null); }} className="bg-white/5 text-white/30 px-8 py-6 rounded-[32px] font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10">
                   RESET
                 </button>
               </div>
             </div>
           ) : (
             <div className="text-center opacity-5">
                <Layout className="w-56 h-56 mx-auto mb-8 text-white" />
                <p className="text-[20px] font-black tracking-[1em] text-white">READY FOR ART</p>
             </div>
           )}
           <canvas ref={canvasRef} className="hidden" />
           <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-amber-500/[0.03] rounded-full blur-[250px] pointer-events-none"></div>
        </div>
      </main>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .animate-shimmer { animation: shimmer 5s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .scanning::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: #f59e0b; box-shadow: 0 0 25px #f59e0b; animation: scan 2s linear infinite;
        }
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(400%); } }
      `}</style>
    </div>
  );
};

export default App;
