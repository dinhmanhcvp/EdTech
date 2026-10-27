import React from 'react';
import {it, expect, vi, afterEach} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {ConceptCheckGate} from '../components/companion/ConceptCheckGate';
afterEach(() => vi.unstubAllGlobals());
it('does not pass a concept gate without server verification', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const pass = vi.fn();
  render(<ConceptCheckGate onPassGate={pass} />);
  fireEvent.change(screen.getByTestId('concept-input-fallback'), {target: {value: 'bảo toàn nguyên tử khối lượng'}});
  fireEvent.click(screen.getByTestId('btn-verify-explanation'));
  await waitFor(() => expect(screen.getByTestId('concept-feedback').textContent).toContain('Chưa xác thực'));
  expect(pass).not.toHaveBeenCalled();
});
