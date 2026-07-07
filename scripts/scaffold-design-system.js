const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DS_DIR = path.join(ROOT_DIR, 'packages', 'design-system');

// Ensure directories exist
const DIRS = [
  'src/core',
  'src/engineering',
  'src/ai',
  'src/navigation',
  'src/motion',
  'src/theme',
  'src/typography',
  'src/icons',
  '.storybook',
  'tests'
];

DIRS.forEach(dir => {
  const fullPath = path.join(DS_DIR, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// Write package.json
const pkgJson = {
  "name": "@beamworks/design-system",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --watch --dts",
    "test": "vitest run",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^11.11.17",
    "lucide-react": "^0.454.0",
    "tailwind-merge": "^2.5.5"
  },
  "devDependencies": {
    "@storybook/react": "^8.4.2",
    "@storybook/react-vite": "^8.4.2",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "storybook": "^8.4.2",
    "tsup": "^8.3.5",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  },
  "peerDependencies": {
    "react": "^18 || ^19",
    "react-dom": "^18 || ^19",
    "tailwindcss": "^4.0.0"
  }
};
fs.writeFileSync(path.join(DS_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2));

// Utilities
fs.writeFileSync(path.join(DS_DIR, 'src/utils.ts'), `
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`);

// Core Component: Button
fs.writeFileSync(path.join(DS_DIR, 'src/core/Button.tsx'), `
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-white shadow hover:bg-accent/90",
        destructive: "bg-red-500 text-white shadow-sm hover:bg-red-500/90",
        outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "span" : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"
`);

// Core Component: Card
fs.writeFileSync(path.join(DS_DIR, 'src/core/Card.tsx'), `
import * as React from "react"
import { cn } from "../utils"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border border-subtle bg-panel text-primary shadow", className)} {...props} />
))
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"
`);

// Engineering Component: BeamCard
fs.writeFileSync(path.join(DS_DIR, 'src/engineering/BeamCard.tsx'), `
import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../core/Card"
import { cn } from "../utils"

export interface BeamCardProps {
  beamId: string;
  section: string;
  length: number;
  yieldStrength: number;
  status: 'optimal' | 'yielding' | 'failed';
  className?: string;
}

export const BeamCard: React.FC<BeamCardProps> = ({ beamId, section, length, yieldStrength, status, className }) => {
  const statusColors = {
    optimal: "text-green-500",
    yielding: "text-yellow-500",
    failed: "text-red-500"
  };

  return (
    <Card className={cn("w-full max-w-sm font-mono text-sm", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Beam: {beamId}</CardTitle>
          <span className={cn("font-bold uppercase text-xs", statusColors[status])}>{status}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex justify-between border-b border-subtle pb-1">
          <span className="text-muted">Section</span>
          <span>{section}</span>
        </div>
        <div className="flex justify-between border-b border-subtle py-1">
          <span className="text-muted">Length (m)</span>
          <span className="tabular-nums">{length.toFixed(2)}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-muted">Yield (MPa)</span>
          <span className="tabular-nums">{yieldStrength.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
`);

// AI Component: ChatBubble
fs.writeFileSync(path.join(DS_DIR, 'src/ai/ChatBubble.tsx'), `
import * as React from "react"
import { cn } from "../utils"

export interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ role, content, className, ...props }, ref) => {
    const isUser = role === 'user';
    return (
      <div ref={ref} className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start", className)} {...props}>
        <div className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser ? "bg-accent text-white rounded-tr-sm" : "bg-panel text-primary border border-subtle rounded-tl-sm"
        )}>
          {content}
        </div>
      </div>
    )
  }
)
ChatBubble.displayName = "ChatBubble"
`);

// Theme: tokens.css
fs.writeFileSync(path.join(DS_DIR, 'src/theme/tokens.css'), `
@theme {
  --color-bg-app: #0C0C0C;
  --color-bg-panel: #1A1A1A;
  --color-border-subtle: #2A2A2A;
  --color-text-primary: #EDEDED;
  --color-text-muted: #888888;
  --color-accent: #2563EB;
  --color-accent-foreground: #FFFFFF;
}

:root {
  color-scheme: dark;
  background-color: var(--color-bg-app);
  color: var(--color-text-primary);
}
`);

// Index Export
fs.writeFileSync(path.join(DS_DIR, 'src/index.ts'), `
export * from "./utils"
export * from "./core/Button"
export * from "./core/Card"
export * from "./engineering/BeamCard"
export * from "./ai/ChatBubble"
`);

// Storybook config
fs.writeFileSync(path.join(DS_DIR, '.storybook/main.ts'), `
import type { StorybookConfig } from "@storybook/react-vite";
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: { name: "@storybook/react-vite", options: {} },
};
export default config;
`);

fs.writeFileSync(path.join(DS_DIR, '.storybook/preview.ts'), `
import type { Preview } from "@storybook/react";
import "../src/theme/tokens.css";
const preview: Preview = {
  parameters: {
    backgrounds: { default: 'dark', values: [{ name: 'dark', value: '#0C0C0C' }] },
  },
};
export default preview;
`);

// Stories
fs.writeFileSync(path.join(DS_DIR, 'src/engineering/BeamCard.stories.tsx'), `
import type { Meta, StoryObj } from '@storybook/react';
import { BeamCard } from './BeamCard';

const meta = {
  title: 'Engineering/BeamCard',
  component: BeamCard,
} satisfies Meta<typeof BeamCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Optimal: Story = {
  args: { beamId: 'B-101', section: 'W14x90', length: 6.5, yieldStrength: 345, status: 'optimal' },
};

export const Yielding: Story = {
  args: { beamId: 'B-102', section: 'W12x50', length: 4.2, yieldStrength: 345, status: 'yielding' },
};

export const Failed: Story = {
  args: { beamId: 'B-103', section: 'W10x30', length: 8.0, yieldStrength: 345, status: 'failed' },
};
`);

// Tests
fs.writeFileSync(path.join(DS_DIR, 'tests/Button.test.tsx'), `
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../src/core/Button';
import React from 'react';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeDefined();
  });
});
`);

console.log('Design System scaffolded successfully!');
