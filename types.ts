
export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  MOBILE = '9:16',
  WIDESCREEN = '16:9'
}

export enum PosterStyle {
  OTOP_PREMIUM = 'OTOP พรีเมียม (น่าน)',
  TRADITIONAL = 'ศิลปะพื้นบ้านน่าน',
  MODERN_MINIMAL = 'โมเดิร์น มินิมอล',
  NATURE_LUXURY = 'ธรรมชาติและหรูหรา',
  STREET_FOOD = 'อาหารพื้นเมือง',
  HANDICRAFT = 'งานฝีมือประณีต',
  LANNA_GOLD = 'ทองล้านนา',
  MINIMAL_KOREA = 'มินิมอลคลีน'
}

export interface GeneratedPoster {
  id: string;
  url: string;
  prompt: string;
  style: PosterStyle;
  aspectRatio: AspectRatio;
  timestamp: number;
}

export interface GenerationConfig {
  prompt: string;
  style: PosterStyle;
  aspectRatio: AspectRatio;
  highQuality: boolean;
  baseImage?: string; // Base64 product image
  removeBackground?: boolean;
  includeLogo?: boolean;
  posterText?: string; // New: Text/Keywords for AI to render
}
