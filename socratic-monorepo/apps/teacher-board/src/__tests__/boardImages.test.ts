import {beforeEach, describe, expect, it, vi} from 'vitest';

const hb = vi.hoisted(() => ({pageUrl: vi.fn()}));
vi.mock('../utils/hubBoard', async () => ({...(await vi.importActual<typeof import('../utils/hubBoard')>('../utils/hubBoard')), hubBoard: hb}));

import {createBoardImageLoader} from '../utils/boardImages';

beforeEach(() => vi.clearAllMocks());

describe('board image loader', () => {
  it('requests each page once and reports failures as a placeholder state', async () => {
    hb.pageUrl.mockRejectedValue(new Error('offline'));
    const onChange = vi.fn();
    const load = createBoardImageLoader(onChange);
    expect(load({assignmentId: 'a', page: 1})).toEqual({state: 'loading'});
    expect(load({assignmentId: 'a', page: 1})).toEqual({state: 'loading'});
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(hb.pageUrl).toHaveBeenCalledTimes(1);
    expect(load({assignmentId: 'a', page: 1})).toEqual({state: 'error'});
  });
});
