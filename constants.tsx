
import React from 'react';

export const STYLE_PRESETS = [
  { id: 'S1', label: 'Minimal (เรียบง่าย)', prompt: 'Minimalist product photography, clean solid background, soft studio lighting, high-end, no text' },
  { id: 'S2', label: 'Luxury (หรูหรา)', prompt: 'Luxury product showcase, silk and gold accents, dramatic lighting, high-end look, no text' },
  { id: 'S3', label: 'Nature (ธรรมชาติ)', prompt: 'Natural organic setting, wooden table, sunlight through leaves, eco-friendly vibe, no text' },
  { id: 'S4', label: 'Bright (สดใส)', prompt: 'Vibrant pop colors, energetic flat lay composition, bright and cheerful, no text' },
  { id: 'S5', label: 'Dark (พรีเมียมเข้ม)', prompt: 'Dark atmospheric background, spotlight on product, mysterious and premium, no text' },
  { id: 'S6', label: 'Thai Modern (ไทยโมเดิร์น)', prompt: 'Modern Thai subtle patterns, warm tones, elegant cultural background, no text' }
];

export const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 (สี่เหลี่ยม)', class: 'aspect-square' },
  { id: '3:4', label: '3:4 (แนวตั้ง)', class: 'aspect-[3/4]' },
  { id: '9:16', label: '9:16 (สตอรี่)', class: 'aspect-[9/16]' }
];
