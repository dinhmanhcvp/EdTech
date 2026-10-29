import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import StudentAppPage from '../app/page';

afterEach(() => window.history.replaceState(null, '', '/'));

describe('student app deep link', () => {
  it('opens the 1:1 tutor on the problem named by ?problem= (Fe + O2 balancing is not in the problem list)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    window.history.replaceState(null, '', '/?tab=COMPANION&problem=CHEMISTRY_BALANCE');
    render(<StudentAppPage />);
    expect((await screen.findAllByText(/Fe \+ O2 -> Fe2O3/)).length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
