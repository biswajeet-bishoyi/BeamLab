export type ThemeId = 'dark-studio' | 'blueprint' | 'corporate' | 'academic' | 'minimal';

export interface PresentationTheme {
  id: ThemeId;
  label: string;
  emoji: string;
  bg: string;
  bgGradient: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentGlow: string;
  numberColor: string;
  cardBg: string;
  divider: string;
  diagramBg: string;
}

export const THEMES: Record<ThemeId, PresentationTheme> = {
  'dark-studio': {
    id: 'dark-studio', label: 'Dark Studio', emoji: '🌑',
    bg: '#0a0f1e',
    bgGradient: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a35 50%, #0a0f1e 100%)',
    surface: 'rgba(15,25,60,0.8)',
    border: 'rgba(99,102,241,0.25)',
    text: '#e2e8f0',
    textMuted: '#64748b',
    accent: '#6366f1',
    accentText: '#a5b4fc',
    accentGlow: 'rgba(99,102,241,0.4)',
    numberColor: '#4f46e5',
    cardBg: 'rgba(15,23,42,0.9)',
    divider: 'rgba(99,102,241,0.2)',
    diagramBg: 'rgba(15,23,42,0.95)',
  },
  'blueprint': {
    id: 'blueprint', label: 'Blueprint', emoji: '📐',
    bg: '#0f2a5c',
    bgGradient: 'linear-gradient(135deg, #0a1f4a 0%, #0f2a5c 60%, #0a1f4a 100%)',
    surface: 'rgba(14,36,78,0.85)',
    border: 'rgba(59,130,246,0.35)',
    text: '#dbeafe',
    textMuted: '#93c5fd',
    accent: '#3b82f6',
    accentText: '#bfdbfe',
    accentGlow: 'rgba(59,130,246,0.4)',
    numberColor: '#1d4ed8',
    cardBg: 'rgba(15,40,90,0.95)',
    divider: 'rgba(59,130,246,0.25)',
    diagramBg: 'rgba(10,30,70,0.97)',
  },
  'corporate': {
    id: 'corporate', label: 'Corporate', emoji: '🏢',
    bg: '#f8fafc',
    bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    surface: 'rgba(255,255,255,0.95)',
    border: 'rgba(203,213,225,0.8)',
    text: '#0f172a',
    textMuted: '#475569',
    accent: '#1e40af',
    accentText: '#1e40af',
    accentGlow: 'rgba(30,64,175,0.15)',
    numberColor: '#1e40af',
    cardBg: '#ffffff',
    divider: '#e2e8f0',
    diagramBg: '#ffffff',
  },
  'academic': {
    id: 'academic', label: 'Academic', emoji: '📚',
    bg: '#fdf8f0',
    bgGradient: 'linear-gradient(135deg, #fdf8f0 0%, #fef3e2 100%)',
    surface: 'rgba(255,252,245,0.95)',
    border: 'rgba(180,130,60,0.25)',
    text: '#1a1a2e',
    textMuted: '#6b5e45',
    accent: '#002147',
    accentText: '#002147',
    accentGlow: 'rgba(0,33,71,0.15)',
    numberColor: '#002147',
    cardBg: '#fffdf7',
    divider: 'rgba(180,130,60,0.2)',
    diagramBg: '#fffdf7',
  },
  'minimal': {
    id: 'minimal', label: 'Minimal', emoji: '◻️',
    bg: '#ffffff',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
    surface: 'rgba(255,255,255,0.98)',
    border: 'rgba(0,0,0,0.08)',
    text: '#111827',
    textMuted: '#6b7280',
    accent: '#111827',
    accentText: '#111827',
    accentGlow: 'rgba(0,0,0,0.08)',
    numberColor: '#9ca3af',
    cardBg: '#f9fafb',
    divider: '#e5e7eb',
    diagramBg: '#f9fafb',
  },
};

export const THEME_LIST = Object.values(THEMES);
