const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PKG_DIR = path.join(ROOT_DIR, 'packages', 'archie-client');

const DIRS = [
  'src/interfaces',
  'src/providers',
  'src/react',
  'src/types',
  'src/events'
];

DIRS.forEach(dir => {
  const fullPath = path.join(PKG_DIR, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// package.json
fs.writeFileSync(path.join(PKG_DIR, 'package.json'), JSON.stringify({
  name: "@beamlab/archie-client",
  version: "0.0.0",
  private: true,
  main: "./dist/index.js",
  module: "./dist/index.mjs",
  types: "./dist/index.d.ts",
  scripts: {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src/",
    "test": "vitest run"
  },
  dependencies: {
    "zustand": "^5.0.0"
  },
  devDependencies: {
    "tsup": "^8.0.2",
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "react": "^18.0.0"
  },
  peerDependencies: {
    "react": "^18.0.0 || ^19.0.0"
  }
}, null, 2));

// tsup.config.ts
fs.writeFileSync(path.join(PKG_DIR, 'tsup.config.ts'), `
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react']
});
`);

// src/types/index.ts
fs.writeFileSync(path.join(PKG_DIR, 'src/types/index.ts'), `
export type ArchieConversationState = 
  | 'idle' 
  | 'submitting' 
  | 'planning' 
  | 'executing' 
  | 'streaming' 
  | 'completed' 
  | 'cancelled' 
  | 'failed';

export interface ArchieMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'streaming' | 'complete' | 'error';
}

export interface ArchiePlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface ArchieExecutionTask {
  id: string;
  name: string;
  progress: number; // 0-100
  status: 'queued' | 'running' | 'completed' | 'failed';
}
`);

// src/interfaces/index.ts
fs.writeFileSync(path.join(PKG_DIR, 'src/interfaces/index.ts'), `
import { ArchieConversationState, ArchieMessage, ArchiePlanStep, ArchieExecutionTask } from '../types';

export interface IArchieClient {
  // State
  getState(): ArchieConversationState;
  getMessages(): ArchieMessage[];
  getPlan(): ArchiePlanStep[];
  getExecution(): ArchieExecutionTask[];
  
  // Actions
  sendMessage(content: string): Promise<void>;
  cancel(): void;
  
  // Subscriptions (Simple callback registry for React integration)
  subscribe(callback: () => void): () => void;
}
`);

// src/providers/MockArchieClient.ts
fs.writeFileSync(path.join(PKG_DIR, 'src/providers/MockArchieClient.ts'), `
import { IArchieClient } from '../interfaces';
import { ArchieConversationState, ArchieMessage, ArchiePlanStep, ArchieExecutionTask } from '../types';

export class MockArchieClient implements IArchieClient {
  private state: ArchieConversationState = 'idle';
  private messages: ArchieMessage[] = [];
  private plan: ArchiePlanStep[] = [];
  private execution: ArchieExecutionTask[] = [];
  
  private listeners: Set<() => void> = new Set();
  private abortController: AbortController | null = null;

  constructor() {
    // Initial mock data
    this.messages = [
      { id: 'm1', role: 'assistant', content: 'Hello! I am Archie. How can I help you design this structure today?', timestamp: new Date().toISOString(), status: 'complete' }
    ];
  }

  getState() { return this.state; }
  getMessages() { return this.messages; }
  getPlan() { return this.plan; }
  getExecution() { return this.execution; }

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.state = 'cancelled';
      this.notify();
    }
  }

  async sendMessage(content: string) {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Add user message
    this.messages = [...this.messages, {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'sent'
    }];
    
    this.state = 'submitting';
    this.notify();

    try {
      await this.sleep(600, signal);
      
      // Planning phase
      this.state = 'planning';
      this.plan = [
        { id: 'p1', title: 'Analyze Request', description: 'Parse intent and extract structural parameters.', status: 'active' },
        { id: 'p2', title: 'Generate Solution', description: 'Formulate structural recommendations.', status: 'pending' }
      ];
      this.notify();
      
      await this.sleep(800, signal);
      this.plan[0].status = 'completed';
      this.plan[1].status = 'active';
      this.notify();

      await this.sleep(800, signal);
      this.plan[1].status = 'completed';

      // Streaming phase
      this.state = 'streaming';
      const responseId = (Date.now() + 1).toString();
      this.messages = [...this.messages, {
        id: responseId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        status: 'streaming'
      }];
      this.notify();

      const fullText = "Based on your request, I recommend analyzing the **W12x40** section.\\n\\nHere is the calculation:\\n$$ M_n = F_y Z_x $$\\n\\nLet me know if you want me to run the Execution Engine to verify this.";
      let currentText = "";
      
      for (const char of fullText.split('')) {
        await this.sleep(30, signal);
        currentText += char;
        this.messages = this.messages.map(m => 
          m.id === responseId ? { ...m, content: currentText } : m
        );
        this.notify();
      }

      this.messages = this.messages.map(m => 
        m.id === responseId ? { ...m, status: 'complete' } : m
      );
      this.state = 'completed';
      this.notify();

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Message cancelled');
      } else {
        this.state = 'failed';
        this.notify();
      }
    }
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  }
}
`);

// src/react/ArchieProvider.tsx
fs.writeFileSync(path.join(PKG_DIR, 'src/react/ArchieProvider.tsx'), `
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { IArchieClient } from '../interfaces';
import { ArchieConversationState, ArchieMessage, ArchiePlanStep, ArchieExecutionTask } from '../types';

interface ArchieContextValue {
  client: IArchieClient;
  state: ArchieConversationState;
  messages: ArchieMessage[];
  plan: ArchiePlanStep[];
  execution: ArchieExecutionTask[];
}

const ArchieContext = createContext<ArchieContextValue | null>(null);

export const ArchieProvider: React.FC<{ client: IArchieClient, children: React.ReactNode }> = ({ client, children }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return client.subscribe(() => setTick(t => t + 1));
  }, [client]);

  const value = useMemo(() => ({
    client,
    state: client.getState(),
    messages: client.getMessages(),
    plan: client.getPlan(),
    execution: client.getExecution()
  }), [client, tick]);

  return <ArchieContext.Provider value={value}>{children}</ArchieContext.Provider>;
};

export const useArchie = () => {
  const ctx = useContext(ArchieContext);
  if (!ctx) throw new Error("useArchie must be used within an ArchieProvider");
  return ctx;
};
`);

// src/index.ts
fs.writeFileSync(path.join(PKG_DIR, 'src/index.ts'), `
export * from './types';
export * from './interfaces';
export * from './providers/MockArchieClient';
export * from './react/ArchieProvider';
`);

console.log('Archie Client scaffolded.');
