
import React from 'react';

export const STYLE_PRESETS = [
  { id: 'OTOP_PREMIUM', label: 'OTOP พรีเมียม', prompt: 'Nan province premium product photography, studio lighting, soft shadows, luxury background, high-end commercial' },
  { id: 'LANNA_GOLD', label: 'ทองล้านนา', prompt: 'Traditional Northern Thai Lanna style, gold accents, dark teak wood background, elegant and cultural' },
  { id: 'MINIMAL_KOREA', label: 'มินิมอลคลีน', prompt: 'Modern minimalist style, soft pastel colors, clean bright lighting, simple and aesthetic' },
  { id: 'DARK_LUXURY', label: 'หรูหราโทนเข้ม', prompt: 'Luxury dark theme, dramatic spotlight, black silk or stone background, premium feel' },
  { id: 'NATURAL_ORGANIC', label: 'ธรรมชาติออร์แกนิก', prompt: 'Surrounded by fresh herbs and leaves, natural sunlight, wooden table, earthy and healthy look' },
  { id: 'STREET_VIBES', label: 'สีสันสดใส', prompt: 'Vibrant pop colors, energetic composition, bright daylight, modern and friendly' },
  { id: 'TRADITIONAL', label: 'พื้นเมืองน่าน', prompt: 'Nan traditional art style, Thai Lanna patterns, warm earthy tones, Nan identity focus' },
  { id: 'PROFESSIONAL', label: 'มืออาชีพ', prompt: 'Corporate style, sharp focus, neutral gray background, clean and trustworthy' }
];

export const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 (Square)', class: 'aspect-square' },
  { id: '3:4', label: '3:4 (Portrait)', class: 'aspect-[3/4]' },
  { id: '4:3', label: '4:3 (Standard)', class: 'aspect-[4/3]' },
  { id: '9:16', label: '9:16 (Story)', class: 'aspect-[9/16]' },
  { id: '16:9', label: '16:9 (Wide)', class: 'aspect-[16/9]' }
];

export const LOADING_MESSAGES = [
  "กำลังเตรียมฉากสำหรับสินค้า OTOP ของคุณ...",
  "กำลังวิเคราะห์องค์ประกอบภาพสินค้า...",
  "ผสานความเป็นน่านเข้ากับภาพถ่าย...",
  "AI กำลังลบพื้นหลังและจัดวางแสงเงา...",
  "รอสักครู่ โปสเตอร์สุดสวยกำลังมา!"
];
