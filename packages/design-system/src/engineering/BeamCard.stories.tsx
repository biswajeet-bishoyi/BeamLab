
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
