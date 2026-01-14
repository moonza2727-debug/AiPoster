
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
  Maximize2,
  Type as TypeIcon,
  Tag,
  Rocket,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { AspectRatio, GeneratedPoster } from './types';
import { STYLE_PRESETS, ASPECT_RATIOS } from './constants';
import { generatePosterImage, openKeySelector, generatePosterSlogan } from './services/gemini';

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
  const [highQuality, setHighQuality] = useState(false); // เริ่มต้นที่ False เพื่อเลี่ยง Error 429
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSloganLoading, setIsSloganLoading] = useState(false);
  const [aiSlogans, setAiSlogans] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAiStudio, setIsAiStudio] = useState(false);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [history, setHistory] = useState<GeneratedPoster[]>([]);
  const [currentPoster, setCurrentPoster] = useState<GeneratedPoster | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if ((window as any).aistudio) {
      setIsAiStudio(true);
    }
  }, []);

  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setProductImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        setLogos(prev => [...prev, { id: Date.now().toString(), url: data }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (id: string) => {
    setLogos(prev => prev.filter(l => l.id !== id));
  };

  const handleAiSlogan = async () => {
    setError(null);
    if (!prompt.trim()) {
      setError("กรุณาใส่ชื่อสินค้าก่อน");
      return;
    }
    setIsSloganLoading(true);
    try {
      const suggestions = await generatePosterSlogan(prompt);
      setAiSlogans(suggestions);
    } catch (e: any) {
      setError("AI คิดสโลแกนไม่ได้ชั่วคราว: " + e.message);
    } finally {
      setIsSloganLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    if (!prompt.trim() && !productImage) {
      setError("กรุณาใส่ชื่อสินค้าหรือรูปภาพ");
      return;
    }

    if (highQuality && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
    }

    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Premium product",
        style: STYLE_PRESETS[styleIndex].prompt as any,
        aspectRatio,
        highQuality: highQuality,
        baseImage: productImage || undefined,
        removeBackground,
        posterText: posterText
      });

      const newPoster: GeneratedPoster = {
        id: Date.now().toString(),
        url: result,
        prompt: prompt,
        style: STYLE_PRESETS[styleIndex].label as any,
        aspectRatio: aspectRatio,
        timestamp: Date.now()
      };

      setCurrentPoster(newPoster);
      setHistory(prev => [newPoster, ...prev].slice(0, 10));
    } catch (err: any) {
      const errMsg = err.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        setError("❌ โควตา Gemini Pro เต็ม! กรุณา 'ปิด' โหมดคุณภาพสูงสุด แล้วลองใหม่อีกครั้ง หรือใช้ Key แบบเสียเงิน (Paid Plan)");
      } else if (errMsg.includes("MISSING_API_KEY")) {
        setError("❌ ไม่พบ API_KEY: โปรดเลือก Key ของคุณ");
      } else {
        setError("❌ เกิดข้อผิดพลาด: " + errMsg);
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

    // วาดโลโก้ (ถ้ามี)
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

    // วาดข้อความลงบนภาพ (ถ้ามี)
    if (posterText) {
      ctx.font = `bold ${canvas.width * 0.06}px Prompt`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 20;
      ctx.fillText(posterText, canvas.width / 2, canvas.height - (canvas.height * 0.1));
    }

    const link = document.createElement('a');
    link.download = `ai-poster-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#03060b] text-slate-200 flex flex-col font-['Prompt']">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold leading-none">AI POSTER PRO</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <span className={`text-[10px] font-bold ${highQuality ? 'text-amber-500' : 'text-slate-500'}`}>โหมดคุณภาพสูง (PRO)</span>
            <button 
              onClick={() => setHighQuality(!highQuality)}
              className={`w-10 h-5 rounded-full relative transition-colors ${highQuality ? 'bg-amber-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${highQuality ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          {isAiStudio && (
            <button onClick={openKeySelector} className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
              <Settings2 className="w-3 h-3" /> ตั้งค่า Key
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-[32px] p-6 space-y-6 border border-white/10 shadow-2xl h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
            
            {/* 01. รูปสินค้า */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-2 tracking-widest"><Layers className="w-4 h-4" /> 01. รูปสินค้า</label>
              <label className="block w-full h-40 border-2 border-dashed border-white/10 rounded-2xl bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden relative group">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? (
                  <img src={productImage} className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-[10px] uppercase">คลิกเพื่อเพิ่มรูปสินค้า</span>
                  </div>
                )}
              </label>
            </div>

            {/* 02. ข้อมูลสินค้า */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><TypeIcon className="w-4 h-4" /> 02. ข้อมูลสินค้า</label>
                <button onClick={handleAiSlogan} disabled={isSloganLoading} className="text-[10px] text-amber-400 font-bold hover:underline disabled:opacity-50">AI ช่วยคิดสโลแกน</button>
              </div>
              <textarea 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                placeholder="ชื่อสินค้าหรือคำอธิบาย..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none h-16 focus:border-amber-500/50" 
              />
              <input 
                type="text" 
                value={posterText} 
                onChange={e => setPosterText(e.target.value)} 
                placeholder="คำพาดหัวที่จะแสดงบนภาพ (Headline)" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500/50" 
              />
            </div>

            {/* 03. สไตล์และขนาด */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><Maximize2 className="w-4 h-4" /> 03. สไตล์และขนาด</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase">สไตล์</label>
                  <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[10px] outline-none">
                    {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase">ขนาด</label>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[10px] outline-none">
                    {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 04. โลโก้แบรนด์ */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> 04. โลโก้แบรนด์</label>
              <div className="flex flex-wrap gap-2">
                {logos.map(logo => (
                  <div key={logo.id} className="relative w-12 h-12 bg-white/5 rounded-lg border border-white/10 p-1 group">
                    <img src={logo.url} className="w-full h-full object-contain" />
                    <button 
                      onClick={() => removeLogo(logo.id)}
                      className="absolute -top-2 -right-2 bg-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2 text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-12 h-12 border border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-amber-500/50">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <Plus className="w-4 h-4 text-slate-500" />
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-400 animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              onClick={handleGenerate} 
              disabled={isGenerating} 
              className="w-full py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-3 bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/10 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
              {isGenerating ? 'กำลังสร้างภาพ...' : 'เนรมิตโปสเตอร์!'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[60px] flex-1 min-h-[500px] flex flex-col items-center justify-center relative p-8 shadow-2xl overflow-hidden">
            {isGenerating ? (
              <div className="text-center space-y-6">
                 <div className="w-24 h-24 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                 <div className="space-y-2">
                    <p className="text-sm font-black animate-pulse uppercase tracking-widest text-amber-500">AI กำลังรังสรรค์งานศิลปะ...</p>
                    <p className="text-[10px] text-slate-500 italic">"อาจใช้เวลาประมาณ 10-20 วินาที"</p>
                 </div>
              </div>
            ) : currentPoster ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in duration-500">
                <div className="relative shadow-2xl rounded-[32px] overflow-hidden border border-white/10 bg-black max-w-full">
                  <img src={currentPoster.url} className="max-h-[65vh] w-auto block" />
                  {/* แสดง Preview โลโก้ */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    {logos.map(logo => (
                      <img key={logo.id} src={logo.url} className="h-10 w-auto object-contain drop-shadow-lg" />
                    ))}
                  </div>
                  {posterText && (
                    <div className="absolute bottom-10 inset-x-0 text-center px-8">
                      <p className="text-white text-3xl font-black italic drop-shadow-2xl uppercase tracking-tighter">{posterText}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <button onClick={downloadImage} className="bg-white text-black px-12 py-4 rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform">
                    <Download className="w-5 h-5" /> ดาวน์โหลดภาพจริง (Full HD)
                  </button>
                  <button onClick={() => setCurrentPoster(null)} className="bg-white/10 text-white px-6 py-4 rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-white/20 transition-all">
                    <Trash2 className="w-5 h-5" /> ล้างภาพ
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                  <ImageIcon className="w-12 h-12 opacity-20" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500">PREVIEW AREA</p>
                  <p className="text-[10px] text-slate-600">กรอกข้อมูลและกดปุ่มเพื่อเริ่มสร้างผลงาน</p>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
