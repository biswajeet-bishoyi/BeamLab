# BeamLab 🏗️

Welcome to **BeamLab** — an interactive, next-generation structural engineering workspace designed to make structural analysis deeply visual, intuitive, and highly capable.

## 🚀 Features

- **Real-Time Analysis Engine:** Calculate shear forces, bending moments, and deflections instantaneously as you drag and drop loads or supports.
- **Interactive Workspace:** A beautiful, responsive interface that allows you to directly manipulate engineering elements on the canvas.
- **AI Engineering Studio ("Archie"):** An intelligent structural engineering companion integrated directly into your workflow to help you model, calculate, and understand complex structural behaviors.
- **Time Machine:** Replay the evolution of your beam's design step-by-step. Go back in time to review how structural changes impacted internal forces.
- **Presentation & Showcase Mode:** Instantly convert your workspace into a beautiful, cinematic, and distraction-free keynote presentation, complete with customizable themes and laser pointers.
- **Example Library:** Get started quickly with a highly comprehensive library of engineering scenarios covering everything from simple introductory beams to advanced hyperstatic structures (like multi-span continuous floors and double overhang balconies).

## 🛠️ Architecture

BeamLab is built as a robust monorepo, utilizing the latest web technologies:

- **Frontend:** React, TypeScript, Vite, Framer Motion, Tailwind CSS, Zustand
- **Monorepo Management:** pnpm workspaces
- **AI Integration:** Google Gemini APIs

## 📦 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/biswajeet-bishoyi/BeamLab.git
   cd BeamLab
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file inside `apps/web` with your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the Development Server:**
   ```bash
   pnpm run dev
   ```

## 📄 License

This project is licensed under the MIT License.
