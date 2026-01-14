
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
  Rocket
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
        const img = new Image();
        img.src = data;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              if (imageData.data[i] > 240 && imageData.data[i+1] > 240 && imageData.data[i+2] > 240) {
                imageData.data[i+3] = 0;
              }
            }
            ctx.putImageData(imageData, 0, 0);
            setLogos(prev => [...prev, { id: Date.now().toString(), url: canvas.toDataURL() }]);
          }
        };
      };
      reader.readAsDataURL(file);
    }
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
      if (e.message === "MISSING_API_KEY") {
        setError("ไม่พบ API Key: โปรดตั้งค่า Key ของคุณก่อน");
      } else {
        setError("AI คิดสโลแกนไม่ได้ชั่วคราว: " + e.message);
      }
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

    // ตรวจสอบ API Key ก่อนใช้โมเดล Pro ตามข้อกำหนด
    const isHighQuality = true;
    if (isHighQuality && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        // Assume selection successful and proceed
      }
    }

    setIsGenerating(true);
    try {
      const result = await generatePosterImage({
        prompt: prompt || "Premium product",
        // ส่ง prompt ของสไตล์ไปให้ AI แทนแค่ชื่อ Label
        style: STYLE_PRESETS[styleIndex].prompt as any,
        aspectRatio,
        highQuality: isHighQuality,
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
      if (err.message === "MISSING_API_KEY") {
        setError("❌ ไม่พบ API_KEY: โปรดเลือก API Key จากโปรเจกต์ที่มีการเรียกเก็บเงิน (Paid Project)");
      } else if (err.message?.includes("Requested entity was not found")) {
        // ตามกฎ: หากพบข้อผิดพลาดนี้ ให้เปิดหน้าต่างเลือก Key ใหม่
        setError("❌ API Key ไม่ถูกต้องหรือยังไม่ได้ตั้งค่า Billing: กำลังเปิดหน้าต่างเลือก Key ใหม่...");
        if ((window as any).aistudio) await (window as any).aistudio.openSelectKey();
      } else {
        setError("❌ สร้างภาพไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"));
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
    for (const logo of logos) {
      const logoImg = new Image();
      logoImg.src = logo.url;
      await new Promise(r => logoImg.onload = r);
      const h = logoSize * (logoImg.height / logoImg.width);
      ctx.drawImage(logoImg, canvas.width - (logoSize + 40), 40, logoSize, h);
    }
    if (posterText) {
      ctx.font = `bold ${canvas.width * 0.07}px Prompt`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 15;
      ctx.fillText(posterText, canvas.width / 2, canvas.height - 100);
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
        {isAiStudio && (
          <button onClick={openKeySelector} className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <Settings2 className="w-3 h-3" /> ตั้งค่า Key
          </button>
        )}
      </nav>

      <main className="flex-1 container mx-auto p-4 lg:p-8 flex flex-col lg:grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-[32px] p-6 space-y-6 border border-white/10 shadow-2xl">
            {/* Input Section */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-2 tracking-widest"><Layers className="w-4 h-4" /> 01. รูปสินค้า</label>
              <label className="block w-full h-44 border-2 border-dashed border-white/10 rounded-2xl bg-black/40 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden relative group">
                <input type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
                {productImage ? (
                  <img src={productImage} className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                    <span className="text-[10px] uppercase">คลิกเพื่อเพิ่มรูปสินค้า</span>
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2"><TypeIcon className="w-4 h-4" /> 02. ข้อมูลสินค้า</label>
                <button onClick={handleAiSlogan} disabled={isSloganLoading} className="text-[10px] text-amber-400 font-bold hover:underline disabled:opacity-50">AI ช่วยคิดสโลแกน</button>
              </div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="ชื่อสินค้า..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none h-16" />
              <input type="text" value={posterText} onChange={e => setPosterText(e.target.value)} placeholder="คำพาดหัวบนภาพ" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">สไตล์</label>
                <select value={styleIndex} onChange={e => setStyleIndex(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[10px] outline-none">
                  {STYLE_PRESETS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ขนาด</label>
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-2 text-[10px] outline-none">
                  {ASPECT_RATIOS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-3 bg-amber-500 text-black disabled:opacity-50">
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
              {isGenerating ? 'กำลังสร้างภาพ...' : 'เนรมิตโปสเตอร์!'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[60px] flex-1 min-h-[500px] flex flex-col items-center justify-center relative p-8 shadow-2xl overflow-hidden">
            {isGenerating ? (
              <div className="text-center">
                 <div className="w-24 h-24 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                 <p className="text-sm font-bold animate-pulse uppercase tracking-widest">AI กำลังรังสรรค์งานศิลปะ...</p>
              </div>
            ) : currentPoster ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in">
                <div className="relative shadow-2xl rounded-[32px] overflow-hidden border border-white/10 bg-black">
                  <img src={currentPoster.url} className="max-h-[65vh] w-auto block" />
                  {posterText && (
                    <div className="absolute bottom-10 inset-x-0 text-center px-8">
                      <p className="text-white text-3xl font-black italic drop-shadow-2xl uppercase">{posterText}</p>
                    </div>
                  )}
                </div>
                <button onClick={downloadImage} className="bg-white text-black px-12 py-4 rounded-full font-black text-[12px] uppercase tracking-widest flex items-center gap-2">
                  <Download className="w-5 h-5" /> ดาวน์โหลดภาพ
                </button>
              </div>
            ) : (
              <div className="text-center opacity-20">
                <ImageIcon className="w-24 h-24 mx-auto mb-4" />
                <p className="text-[11px] font-black uppercase tracking-[0.5em]">PREVIEW AREA</p>
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
