
import type { Preview } from "@storybook/react";
import "../src/theme/tokens.css";
const preview: Preview = {
  parameters: {
    backgrounds: { default: 'dark', values: [{ name: 'dark', value: '#0C0C0C' }] },
  },
};
export default preview;
