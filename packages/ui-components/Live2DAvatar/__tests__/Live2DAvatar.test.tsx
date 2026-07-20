import React from 'react';
import { render, screen } from '@testing-library/react';
import { Live2DAvatar } from '../Live2DAvatar.js';

describe('Live2DAvatar', () => {
  it('renders loading state while scripts are loading', () => {
    render(
      <Live2DAvatar modelUrl="/models/miara/miara_pro_t03.model3.json" width={320} height={420} />,
    );

    expect(screen.getByText('Loading avatar…')).toBeInTheDocument();
  });
});
