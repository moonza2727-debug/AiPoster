
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Image as ImageIcon, Download, RefreshCw, X, Plus,
  Rocket, Zap, Layout, Wand2, Scissors
} from 'lucide-react';
import { removeBackground } from "@imgly/background-removal";
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS } from './constants';
import { generatePosterImage, testConnection } from './services/gemini';

interface Logo { id: string; url: string; }

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [posterText, setPosterText] = useState('');
  const [styleIndex, setStyleIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'testing' | 'valid' | 'invalid' | 'none'>('none');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const checkKey = async () => {
    setKeyStatus('testing');
    try {
      const res = await testConnection();
      setKeyStatus(res.valid ? 'valid' : 'invalid');
    } catch {
      setKeyStatus('invalid');
    }
  };

  useEffect(() => { checkKey(); }, []);

  const handleRemoveBackground = async () => {
    if (!productImage) return;
    setIsRemovingBg(true);
    try {
      // imgly background removal works with images and returns a blob
      const blob = await removeBackground(productImage, {
        progress: (key, current, total) => {
          console.log(`Processing: ${key} ${current}/${total}`);
        }
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result as string);
        setIsRemovingBg(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถตัดพื้นหลังได้ในขณะนี้ กรุณาลองใหม่ครับ");
      setIsRemovingBg(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !productImage) {
      alert("กรุณาอัปโหลดรูปสินค้าหรือพิมพ์รายละเอียดก่อนครับ");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt: prompt || "premium product background",
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio,
        highQuality: true,
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
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการสร้างฉากหลัง กรุณาลองใหม่ครับ");
    } finally {
      setIsGenerating(false);
    }
  };

  const drawToCanvas = async () => {
    if (!currentPoster || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";
    bgImg.src = currentPoster.url;
    await new Promise((resolve) => {
      bgImg.onload = resolve;
      bgImg.onerror = resolve;
    });

    canvas.width = bgImg.width;
    canvas.height = bgImg.height;
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    if (productImage) {
      const prodImg = new Image();
      prodImg.src = productImage;
      await new Promise(r => prodImg.onload = r);
      
      const maxProdWidth = canvas.width * 0.75;
      const maxProdHeight = canvas.height * 0.65;
      const ratio = Math.min(maxProdWidth / prodImg.width, maxProdHeight / prodImg.height);
      const w = prodImg.width * ratio;
      const h = prodImg.height * ratio;
      
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;
      
      ctx.drawImage(prodImg, (canvas.width - w) / 2, (canvas.height - h) / 1.7, w, h);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    const padding = canvas.width * 0.05;

    if (posterText.trim()) {
      const fontSize = canvas.width * 0.085;
      ctx.font = `bold ${fontSize}px "Prompt", sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(posterText, canvas.width / 2, canvas.height - (padding * 2.5));
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    const logoSize = canvas.width * 0.12;
    let logoXOffset = padding;
    for (const logo of logos) {
      const logoImg = new Image();
      logoImg.src = logo.url;
      await new Promise(r => logoImg.onload = r);
      const h = logoSize * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - (logoSize + logoXOffset), padding, logoSize, h);
      logoXOffset += logoSize + 20;
    }

    return canvas.toDataURL('image/png');
  };

  const handleDownload = async () => {
    const dataUrl = await drawToCanvas();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `AI-Poster-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  useEffect(() => {
    if (currentPoster) {
      const timer = setTimeout(() => {
        drawToCanvas().then(url => setPreviewUrl(url));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPoster, posterText, logos, productImage]);

  return (
    <div className="min-h-screen bg-[#010204] text-slate-200 flex flex-col font-['Prompt'] text-sm">
      <nav className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase italic leading-none">POSTER <span className="text-amber-500">PRO</span></h1>
            <p className="text-[8px] text-slate-500 font-bold tracking-widest uppercase">ระบบสตูดิโอ AI ครบวงจร</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full border text-[9px] font-bold flex items-center gap-2 ${
          keyStatus === 'valid' ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 'bg-slate-500/5 border-slate-500/20 text-slate-500'
        }`}>
          {keyStatus === 'valid' ? <Zap className="w-3 h-3" /> : <Scissors className="w-3 h-3" />}
          {keyStatus === 'valid' ? 'AI SMART MODE' : 'READY TO CUT'}
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 grid lg:grid-cols-12 gap-6 overflow-hidden max-w-7xl">
        <div className="lg:col-span-4 space-y-4 h-full overflow-y-auto pr-1 custom-scrollbar pb-10">
          <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-5 space-y-5 backdrop-blur-xl">
            
            {/* Logo Section */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 bg-amber-500 rounded-full"></div> โลโก้แบรนด์
              </label>
              <div className="flex flex-wrap gap-2">
                {logos.map(logo => (
                  <div key={logo.id} className="relative w-10 h-10 bg-white rounded-lg border border-white/10 group overflow-hidden">
                    <img src={logo.url} className="w-full h-full object-contain p-1" />
                    <button onClick={() => setLogos(l => l.filter(x => x.id !== logo.id))} className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
                <label className="w-10 h-10 border border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5 transition-all">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setLogos(prev => [...prev, { id: Date.now().toString(), url: ev.target?.result as string }]);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  <Plus className="w-4 h-4 text-slate-500" />
                </label>
              </div>
            </div>

            {/* Product Section */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 bg-amber-500 rounded-full"></div> รูปสินค้าจริง
              </label>
              <div className={`relative w-full h-44 border border-white/10 rounded-xl overflow-hidden bg-black/40 group ${isRemovingBg ? 'scanning' : ''}`}>
                {productImage ? (
                  <>
                    <img src={productImage} className={`w-full h-full object-contain p-4 transition-all ${isRemovingBg ? 'opacity-30' : ''}`} />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button 
                        onClick={handleRemoveBackground} 
                        disabled={isRemovingBg}
                        className="bg-amber-500 text-black px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isRemovingBg ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        ลบพื้นหลัง (AI)
                      </button>
                      <button onClick={() => setProductImage(null)} className="bg-black/60 text-white p-1.5 rounded-lg hover:bg-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="h-full w-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setProductImage(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                    <ImageIcon className="w-6 h-6 mb-2 opacity-30" />
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">อัปโหลดรูปสินค้า</span>
                  </label>
                )}
                {isRemovingBg && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter">กำลังลบพื้นหลัง...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Inputs Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">ข้อความพาดหัว</label>
                <input type="text" value={posterText} onChange={e => setPosterText(e.target.value)} placeholder="ชื่อสินค้าหรือสโลแกน" className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-xs outline-none focus:border-amber-500/40 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">รายละเอียดฉากหลัง</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="อธิบายฉาก เช่น 'บนหาดทรายขาว', 'ในคาเฟ่สวยๆ'" className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-xs outline-none focus:border-amber-500/40 h-16 resize-none text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold uppercase cursor-pointer outline-none">
                {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
              </select>
              <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="bg-black/80 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold uppercase cursor-pointer outline-none">
                {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={isGenerating || isRemovingBg} 
              className="w-full py-4 rounded-full font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 transition-all"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              เจนเนอเรทฉากหลัง AI
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-[32px] p-6 relative overflow-hidden h-full shadow-inner">
           {isGenerating ? (
             <div className="text-center space-y-4">
                <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
                <p className="text-amber-500 font-bold text-[10px] tracking-widest uppercase">กำลังเนรมิตฉากหลังระดับสตูดิโอ...</p>
             </div>
           ) : previewUrl ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-6 animate-in fade-in duration-700">
               <div className="relative shadow-2xl rounded-xl overflow-hidden border border-white/10 max-w-full max-h-[60vh]">
                 <img src={previewUrl} className="max-h-full w-auto block shadow-2xl" alt="AI Poster Result" />
               </div>
               <div className="flex gap-3">
                  <button onClick={handleDownload} className="bg-white text-black px-10 py-3.5 rounded-full font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-xl">
                    <Download className="w-4 h-4" /> ดาวน์โหลดภาพ
                  </button>
                  <button onClick={() => { setCurrentPoster(null); setPreviewUrl(null); }} className="bg-white/5 border border-white/10 text-white/60 px-6 py-3.5 rounded-full font-bold text-[10px] uppercase hover:bg-white/10 transition-all">
                    ออกแบบใหม่
                  </button>
               </div>
             </div>
           ) : (
             <div className="opacity-10 text-center select-none">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">อัปโหลดสินค้าและกดลบพื้นหลังเพื่อเริ่ม</p>
             </div>
           )}
           <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>
    </div>
  );
};

export default App;
