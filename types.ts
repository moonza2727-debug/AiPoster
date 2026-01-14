
export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT_IG = '4:5',
  PORTRAIT_STD = '3:4',
  PORTRAIT_TALL = '2:3',
  MOBILE = '9:16',
  LANDSCAPE_STD = '4:3',
  LANDSCAPE_WIDE = '16:9',
  ULTRAWIDE = '21:9'
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
  baseImage?: string;
  removeBackground?: boolean;
  includeLogo?: boolean;
  posterText?: string;
}
