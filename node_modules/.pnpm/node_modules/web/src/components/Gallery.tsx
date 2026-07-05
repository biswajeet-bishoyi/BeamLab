import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  Search, 
  Sparkles, 
  HardHat,
  Home
} from 'lucide-react';
import { toLength, toForce, toForcePerLength } from '@beamworks/core-engine/units/brands';

// Smart Presets Data
const PRESETS = [
  {
    id: 'residential-floor',
    category: 'Residential',
    title: 'Floor Beam',
    desc: 'Typical timber floor joist with a uniform distributed load.',
    span: 5,
    difficulty: 'Beginner',
    model: {
      span: toLength(5),
      material: { id: 'm3', name: 'Timber (11 GPa)', E: 11e9, density: 600 },
      section: { id: 'sec3', name: '200x200 Timber (Square)', area: 0.04, momentOfInertia: 1.33e-4, height: 0.2 },
      supports: [
        { id: 's1', type: 'pin' as const, position: toLength(0) },
        { id: 's2', type: 'roller' as const, position: toLength(5) }
      ],
      loads: [
        { id: 'l1', type: 'distributed' as const, startPosition: toLength(0), endPosition: toLength(5), magnitude: toForcePerLength(-2000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="4" />
        <polygon points="10,20 5,30 15,30" fill="#3B82F6" />
        <circle cx="90" cy="25" r="5" fill="#3B82F6" />
        <rect x="10" y="5" width="80" height="10" fill="rgba(239, 68, 68, 0.2)" stroke="#EF4444" strokeWidth="2" />
        <motion.path 
          d="M 50 15 L 50 5" 
          stroke="#EF4444" strokeWidth="2" markerEnd="url(#arrow)"
          initial={{ y: -5 }} animate={{ y: 0 }} transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse' }}
        />
      </svg>
    )
  },
  {
    id: 'industrial-crane',
    category: 'Industrial',
    title: 'Crane Beam',
    desc: 'Heavy steel I-beam supporting an overhead moving crane.',
    span: 12,
    difficulty: 'Intermediate',
    model: {
      span: toLength(12),
      material: { id: 'm1', name: 'Structural Steel (200 GPa)', E: 200e9, density: 7850 },
      section: { id: 'sec2', name: 'W14x90 (I-Beam Heavy)', area: 0.0171, momentOfInertia: 4.16e-4, height: 0.356 },
      supports: [
        { id: 's1', type: 'pin' as const, position: toLength(0) },
        { id: 's2', type: 'roller' as const, position: toLength(12) }
      ],
      loads: [
        { id: 'l1', type: 'point' as const, position: toLength(6), magnitude: toForce(-50000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <path d="M 5 20 L 95 20" stroke="currentColor" strokeWidth="6" />
        <rect x="0" y="20" width="10" height="20" fill="#3B82F6" />
        <rect x="90" y="20" width="10" height="20" fill="#3B82F6" />
        <motion.g 
          initial={{ x: 20 }} animate={{ x: 70 }} transition={{ repeat: Infinity, duration: 3, repeatType: 'reverse', ease: "easeInOut" }}
        >
          <rect x="-10" y="5" width="20" height="10" fill="#F59E0B" rx="2" />
          <line x1="0" y1="15" x2="0" y2="35" stroke="#F59E0B" strokeWidth="2" />
          <path d="M -5 35 Q 0 40 5 35" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        </motion.g>
      </svg>
    )
  },
  {
    id: 'bridge-girder',
    category: 'Bridge',
    title: 'Continuous Bridge Girder',
    desc: 'Multi-span concrete bridge girder with vehicles.',
    span: 30,
    difficulty: 'Advanced',
    model: {
      span: toLength(30),
      material: { id: 'm4', name: 'Concrete (30 GPa)', E: 30e9, density: 2400 },
      section: { id: 'sec2', name: 'W14x90 (I-Beam Heavy)', area: 0.0171, momentOfInertia: 4.16e-4, height: 0.356 },
      supports: [
        { id: 's1', type: 'pin' as const, position: toLength(0) },
        { id: 's2', type: 'roller' as const, position: toLength(15) },
        { id: 's3', type: 'roller' as const, position: toLength(30) }
      ],
      loads: [
        { id: 'l1', type: 'distributed' as const, startPosition: toLength(0), endPosition: toLength(30), magnitude: toForcePerLength(-10000) },
        { id: 'l2', type: 'point' as const, position: toLength(7.5), magnitude: toForce(-20000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <path d="M 0 20 L 100 20" stroke="currentColor" strokeWidth="5" />
        <polygon points="10,20 5,35 15,35" fill="#3B82F6" />
        <polygon points="50,20 45,35 55,35" fill="#3B82F6" />
        <polygon points="90,20 85,35 95,35" fill="#3B82F6" />
        
        <motion.g initial={{ x: -10 }} animate={{ x: 110 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
          <rect x="0" y="10" width="12" height="6" fill="#EF4444" rx="2" />
          <circle cx="2" cy="17" r="2" fill="#1E293B" />
          <circle cx="10" cy="17" r="2" fill="#1E293B" />
        </motion.g>
        
        <motion.g initial={{ x: 110 }} animate={{ x: -10 }} transition={{ repeat: Infinity, duration: 5, ease: "linear", delay: 1 }}>
          <rect x="0" y="10" width="16" height="8" fill="#3B82F6" rx="2" />
          <circle cx="3" cy="19" r="2.5" fill="#1E293B" />
          <circle cx="13" cy="19" r="2.5" fill="#1E293B" />
        </motion.g>
      </svg>
    )
  },
  {
    id: 'cantilever-balcony',
    category: 'Residential',
    title: 'Cantilever Balcony',
    desc: 'A balcony extending from a fixed wall, carrying a uniform load.',
    span: 4,
    difficulty: 'Intermediate',
    model: {
      span: toLength(4),
      material: { id: 'm4', name: 'Concrete (30 GPa)', E: 30e9, density: 2400 },
      section: { id: 'sec4', name: '300x400 Concrete', area: 0.12, momentOfInertia: 0.0016, height: 0.4 },
      supports: [
        { id: 's1', type: 'fixed' as const, position: toLength(0) }
      ],
      loads: [
        { id: 'l1', type: 'distributed' as const, startPosition: toLength(0), endPosition: toLength(4), magnitude: toForcePerLength(-5000) },
        { id: 'l2', type: 'point' as const, position: toLength(4), magnitude: toForce(-2000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <rect x="0" y="5" width="10" height="30" fill="currentColor" opacity="0.3" />
        <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="6" />
        <rect x="10" y="5" width="80" height="10" fill="rgba(239, 68, 68, 0.2)" stroke="#EF4444" strokeWidth="2" />
        <motion.circle cx="90" cy="15" r="4" fill="#3B82F6" initial={{ y: -5 }} animate={{ y: 0 }} transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse' }} />
      </svg>
    )
  },
  {
    id: 'overhanging-beam',
    category: 'Commercial',
    title: 'Overhanging Roof Beam',
    desc: 'A simply supported beam with an overhang carrying point loads.',
    span: 8,
    difficulty: 'Intermediate',
    model: {
      span: toLength(8),
      material: { id: 'm1', name: 'Structural Steel (200 GPa)', E: 200e9, density: 7850 },
      section: { id: 'sec1', name: 'W12x26 (I-Beam)', area: 0.0049, momentOfInertia: 8.5e-5, height: 0.31 },
      supports: [
        { id: 's1', type: 'pin' as const, position: toLength(2) },
        { id: 's2', type: 'roller' as const, position: toLength(6) }
      ],
      loads: [
        { id: 'l1', type: 'point' as const, position: toLength(0), magnitude: toForce(-15000) },
        { id: 'l2', type: 'point' as const, position: toLength(8), magnitude: toForce(-15000) },
        { id: 'l3', type: 'distributed' as const, startPosition: toLength(2), endPosition: toLength(6), magnitude: toForcePerLength(-2000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="4" />
        <polygon points="30,20 25,30 35,30" fill="#3B82F6" />
        <circle cx="70" cy="25" r="5" fill="#3B82F6" />
        <motion.path d="M 10 10 L 10 0" stroke="#EF4444" strokeWidth="2" markerEnd="url(#arrow)" initial={{ y: -5 }} animate={{ y: 0 }} transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }} />
        <motion.path d="M 90 10 L 90 0" stroke="#EF4444" strokeWidth="2" markerEnd="url(#arrow)" initial={{ y: -5 }} animate={{ y: 0 }} transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse', delay: 0.5 }} />
      </svg>
    )
  },
  {
    id: 'fixed-fixed-beam',
    category: 'Industrial',
    title: 'Fixed-Fixed Machine Shaft',
    desc: 'A highly constrained shaft resisting large point loads.',
    span: 6,
    difficulty: 'Advanced',
    model: {
      span: toLength(6),
      material: { id: 'm1', name: 'Structural Steel', E: 200e9, density: 7850 },
      section: { id: 'sec5', name: 'Solid Circular', area: 0.00785, momentOfInertia: 4.9e-6, height: 0.1 },
      supports: [
        { id: 's1', type: 'fixed' as const, position: toLength(0) },
        { id: 's2', type: 'fixed' as const, position: toLength(6) }
      ],
      loads: [
        { id: 'l1', type: 'point' as const, position: toLength(3), magnitude: toForce(-100000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <rect x="0" y="5" width="10" height="30" fill="currentColor" opacity="0.3" />
        <rect x="90" y="5" width="10" height="30" fill="currentColor" opacity="0.3" />
        <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="8" />
        <motion.path d="M 50 15 L 50 5" stroke="#EF4444" strokeWidth="3" markerEnd="url(#arrow)" initial={{ scaleY: 1 }} animate={{ scaleY: 1.2 }} transition={{ repeat: Infinity, duration: 0.5, repeatType: 'reverse' }} style={{ transformOrigin: "top" }} />
      </svg>
    )
  },
  {
    id: 'propped-cantilever',
    category: 'Educational',
    title: 'Propped Cantilever',
    desc: 'A hyperstatic beam fixed at one end and supported by a roller at the other.',
    span: 5,
    difficulty: 'Intermediate',
    model: {
      span: toLength(5),
      material: { id: 'm1', name: 'Structural Steel (200 GPa)', E: 200e9, density: 7850 },
      section: { id: 'sec1', name: 'W12x26 (I-Beam)', area: 0.0049, momentOfInertia: 8.5e-5, height: 0.31 },
      supports: [
        { id: 's1', type: 'fixed' as const, position: toLength(0) },
        { id: 's2', type: 'roller' as const, position: toLength(5) }
      ],
      loads: [
        { id: 'l1', type: 'distributed' as const, startPosition: toLength(0), endPosition: toLength(5), magnitude: toForcePerLength(-5000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <rect x="0" y="5" width="10" height="30" fill="currentColor" opacity="0.3" />
        <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="4" />
        <circle cx="90" cy="25" r="5" fill="#3B82F6" />
        <rect x="10" y="5" width="80" height="10" fill="rgba(239, 68, 68, 0.2)" stroke="#EF4444" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: 'axle-load-train',
    category: 'Bridge',
    title: 'Axle Load Train',
    desc: 'A simple span carrying 4 heavy point loads spaced evenly (truck axles).',
    span: 20,
    difficulty: 'Intermediate',
    model: {
      span: toLength(20),
      material: { id: 'm4', name: 'Concrete (30 GPa)', E: 30e9, density: 2400 },
      section: { id: 'sec4', name: 'Concrete Girder', area: 0.12, momentOfInertia: 0.0016, height: 0.4 },
      supports: [
        { id: 's1', type: 'pin' as const, position: toLength(0) },
        { id: 's2', type: 'roller' as const, position: toLength(20) }
      ],
      loads: [
        { id: 'l1', type: 'point' as const, position: toLength(6), magnitude: toForce(-40000) },
        { id: 'l2', type: 'point' as const, position: toLength(8), magnitude: toForce(-40000) },
        { id: 'l3', type: 'point' as const, position: toLength(12), magnitude: toForce(-40000) },
        { id: 'l4', type: 'point' as const, position: toLength(14), magnitude: toForce(-40000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="4" />
        <polygon points="10,20 5,30 15,30" fill="#3B82F6" />
        <circle cx="90" cy="25" r="5" fill="#3B82F6" />
        <motion.g initial={{ x: 0 }} animate={{ x: 20 }} transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}>
          {[34, 42, 58, 66].map((x, i) => (
            <path key={i} d={`M ${x} 10 L ${x} 18`} stroke="#EF4444" strokeWidth="2" markerEnd="url(#arrow)" />
          ))}
        </motion.g>
      </svg>
    )
  },
  {
    id: 'multi-span-continuous',
    category: 'Commercial',
    title: 'Multi-Span Continuous Floor',
    desc: 'A long continuous beam resting on 4 evenly spaced supports.',
    span: 24,
    difficulty: 'Advanced',
    model: {
      span: toLength(24),
      material: { id: 'm1', name: 'Structural Steel (200 GPa)', E: 200e9, density: 7850 },
      section: { id: 'sec1', name: 'W12x26 (I-Beam)', area: 0.0049, momentOfInertia: 8.5e-5, height: 0.31 },
      supports: [
        { id: 's1', type: 'pin' as const, position: toLength(0) },
        { id: 's2', type: 'roller' as const, position: toLength(8) },
        { id: 's3', type: 'roller' as const, position: toLength(16) },
        { id: 's4', type: 'roller' as const, position: toLength(24) }
      ],
      loads: [
        { id: 'l1', type: 'distributed' as const, startPosition: toLength(0), endPosition: toLength(24), magnitude: toForcePerLength(-4000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <path d="M 5 20 L 95 20" stroke="currentColor" strokeWidth="4" />
        <polygon points="5,20 0,30 10,30" fill="#3B82F6" />
        <circle cx="35" cy="25" r="5" fill="#3B82F6" />
        <circle cx="65" cy="25" r="5" fill="#3B82F6" />
        <circle cx="95" cy="25" r="5" fill="#3B82F6" />
        <rect x="5" y="5" width="90" height="10" fill="rgba(239, 68, 68, 0.2)" stroke="#EF4444" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: 'symmetrical-balcony',
    category: 'Residential',
    title: 'Double Overhang Balcony',
    desc: 'A symmetrical beam supported in the center, carrying massive edge loads.',
    span: 10,
    difficulty: 'Intermediate',
    model: {
      span: toLength(10),
      material: { id: 'm4', name: 'Concrete (30 GPa)', E: 30e9, density: 2400 },
      section: { id: 'sec4', name: 'Concrete Girder', area: 0.12, momentOfInertia: 0.0016, height: 0.4 },
      supports: [
        { id: 's1', type: 'pin' as const, position: toLength(3) },
        { id: 's2', type: 'roller' as const, position: toLength(7) }
      ],
      loads: [
        { id: 'l1', type: 'point' as const, position: toLength(0), magnitude: toForce(-25000) },
        { id: 'l2', type: 'point' as const, position: toLength(10), magnitude: toForce(-25000) }
      ]
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-800 dark:text-slate-200 overflow-visible">
        <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="6" />
        <polygon points="34,20 29,30 39,30" fill="#3B82F6" />
        <circle cx="66" cy="25" r="5" fill="#3B82F6" />
        <motion.path d="M 10 5 L 10 15" stroke="#EF4444" strokeWidth="3" markerEnd="url(#arrow)" initial={{ scaleY: 1 }} animate={{ scaleY: 1.3 }} transition={{ repeat: Infinity, duration: 0.6, repeatType: 'reverse' }} style={{ transformOrigin: "top" }} />
        <motion.path d="M 90 5 L 90 15" stroke="#EF4444" strokeWidth="3" markerEnd="url(#arrow)" initial={{ scaleY: 1 }} animate={{ scaleY: 1.3 }} transition={{ repeat: Infinity, duration: 0.6, repeatType: 'reverse' }} style={{ transformOrigin: "top" }} />
      </svg>
    )
  },
  {
    id: 'blank',
    category: 'Educational',
    title: 'Blank Project',
    desc: 'Start completely from scratch with no predefined assumptions.',
    span: 10,
    difficulty: 'Beginner',
    model: {
      span: toLength(10),
      material: { id: 'm1', name: 'Structural Steel (200 GPa)', E: 200e9, density: 7850 },
      section: { id: 'sec1', name: 'W12x26 (I-Beam)', area: 0.0049, momentOfInertia: 8.5e-5, height: 0.31 },
      supports: [],
      loads: []
    },
    svg: (
      <svg viewBox="0 0 100 40" className="w-full h-full text-slate-400 overflow-visible">
        <path d="M 10 20 L 90 20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
        <motion.line 
          x1="50" y1="5" x2="50" y2="35" stroke="currentColor" strokeWidth="1"
          initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse' }}
        />
        <motion.line 
          x1="35" y1="20" x2="65" y2="20" stroke="currentColor" strokeWidth="1"
          initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse', delay: 0.5 }}
        />
      </svg>
    )
  }
];

const CATEGORIES = ['All', 'Residential', 'Commercial', 'Industrial', 'Bridge', 'Infrastructure', 'Educational'];

export function Gallery() {
  const setView = useStore(state => state.setView);
  const loadPreset = useStore(state => state.loadPreset);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPresets = PRESETS.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="absolute inset-0 z-50 bg-[#FAFAFA] dark:bg-[#0A0F1C] overflow-y-auto custom-scrollbar flex flex-col">
      {/* Background Subtle Blueprint */}
      <div className="fixed inset-0 bg-blueprint opacity-40 dark:opacity-20 pointer-events-none" style={{ backgroundSize: '60px 60px' }}></div>
      <div className="fixed inset-0 bg-gradient-to-b from-transparent to-white/80 dark:to-[#0A0F1C]/90 pointer-events-none"></div>

      {/* Header & Navigation */}
      <header className="relative z-40 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/30 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0">
        <button 
          onClick={() => setView('dashboard')}
          className="flex items-center gap-4 hover:opacity-80 transition-opacity text-left"
        >
          <div 
            className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors text-slate-700 dark:text-slate-200"
          >
            <Home size={20} />
          </div>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>
          <div className="bg-yellow-400 p-2 rounded-xl text-black">
            <HardHat size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            BeamLab Gallery
          </h1>
        </button>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12 flex flex-col gap-12 w-full">
        
        {/* Title & AI Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center gap-6"
        >
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            What would you like to build today?
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 font-light max-w-2xl">
            Choose a smart template to instantly configure your engineering workspace, or start from a blank blueprint.
          </p>

          <div className="w-full max-w-2xl mt-4 relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-blue-500">
              <Sparkles size={24} />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. I'm designing a 12m steel crane beam..."
              className="w-full bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-full py-5 pl-16 pr-32 outline-none focus:border-blue-500 transition-all shadow-lg text-lg"
            />
            <button className="absolute inset-y-2 right-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-full transition-colors shadow-md">
              Ask AI
            </button>
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeCategory === cat 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-105'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Gallery Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4"
        >
          <AnimatePresence>
            {filteredPresets.map((preset, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                key={preset.id}
                onClick={() => loadPreset(preset.model)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col gap-6 cursor-pointer group hover:shadow-2xl hover:shadow-blue-500/10 transition-all hover:-translate-y-2"
              >
                {/* SVG Illustration Container */}
                <div className="h-48 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center p-6 border border-slate-100 dark:border-slate-700/50 group-hover:border-blue-500/30 transition-colors relative overflow-hidden">
                  <div className="absolute inset-0 bg-blueprint opacity-10"></div>
                  {preset.svg}
                </div>
                
                {/* Info */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                      {preset.category}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                      {preset.difficulty}
                    </span>
                  </div>
                  <h3 className="font-bold text-2xl text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors flex items-center gap-2">
                    {preset.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    {preset.desc}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {preset.span}m Span
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {preset.model.material.name.split(' ')[0]}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredPresets.length === 0 && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400">
              <Search size={48} className="mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">No templates found</h3>
              <p>Try adjusting your search or category filter.</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
