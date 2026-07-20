import React from 'react';
import { render, screen } from '@testing-library/react';

/**
 * The React component lives in DeepTreeEchoBot.tsx, which shares its base
 * name with the DeepTreeEchoBot.ts class module. Static imports resolve to
 * the .ts file first, so the component is loaded via a dynamic import of
 * the explicit .tsx path instead.
 */
const componentModulePath = '../DeepTreeEchoBot.tsx';

let DeepTreeEchoBot: React.FC;

beforeAll(async () => {
  const mod = await import(componentModulePath);
  DeepTreeEchoBot = mod.default;
});

describe('DeepTreeEchoBot', () => {
  it('renders the bot with idle state by default', () => {
    render(<DeepTreeEchoBot />);

    // Check for the bot state indicator
    const statusElement = screen.getByText(/idle/i, { exact: false });
    expect(statusElement).toBeInTheDocument();
  });

  it('has no pending response by default', () => {
    render(<DeepTreeEchoBot />);

    // The bot response element should not exist initially
    const responseElement = screen.queryByTestId('bot-response');
    expect(responseElement).not.toBeInTheDocument();
  });

  // More tests would be added here for command processing, message handling, etc.
  // These would use act() and waitFor() to test asynchronous operations
});
