
import { PosterStyle } from './types';

export const STYLE_PRESETS = [
  { 
    id: 'S1', 
    label: PosterStyle.OTOP_PREMIUM, 
    prompt: 'Premium contemporary Lanna graphic art, dark teal and emerald background, stylized golden Thai clouds, elegant Lanna ornaments, soft glowing particles' 
  },
  { 
    id: 'S2', 
    label: PosterStyle.TRADITIONAL, 
    prompt: 'Modernized Wat Phumin style mural art elements, indigo and gold color palette, refined traditional Nan textile textures, clean contemporary layout' 
  },
  { 
    id: 'S3', 
    label: PosterStyle.MODERN_MINIMAL, 
    prompt: 'Clean architectural Lanna design, soft neutral shadows, off-white and gold accents, minimalist but rich in detail' 
  },
  { 
    id: 'S4', 
    label: PosterStyle.NATURE_LUXURY, 
    prompt: 'Dreamy misty Nan mountains (Doi Samer Dao vibe), floating emerald leaves, natural morning golden light, premium organic atmosphere' 
  },
  { 
    id: 'S5', 
    label: PosterStyle.LANNA_GOLD, 
    prompt: 'Royal Lanna prestige, dark obsidian background, heavy gold leaf explosion, floating gold dust, majestic and high-end' 
  },
  { 
    id: 'S6', 
    label: PosterStyle.MINIMAL_KOREA, 
    prompt: 'Clean bright lifestyle studio, trendy pastel tones, soft diffuse lighting, modern airy aesthetic' 
  }
];

export const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 (จัตุรัส)' },
  { id: '4:5', label: '4:5 (FB/IG)' },
  { id: '3:4', label: '3:4 (มาตรฐาน)' },
  { id: '9:16', label: '9:16 (Stories)' },
  { id: '16:9', label: '16:9 (แนวนอน)' }
];
