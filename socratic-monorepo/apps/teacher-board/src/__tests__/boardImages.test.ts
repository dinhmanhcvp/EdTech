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

describe('review fixes: inserted page images', async () => {
  const {imageStroke, eraserHitsBlock} = await import('../utils/boardImage');
  const {cleanPages} = await import('../utils/lessonLibrary');
  const img = imageStroke({assignmentId: 'asg-s', page: 2, width: 1000, height: 1400});

  it('survives a board reload (cleanPages keeps the image object)', () => {
    const [[back]] = cleanPages([[JSON.parse(JSON.stringify(img))]]);
    expect(back.image).toEqual({assignmentId: 'asg-s', page: 2});
    expect(cleanPages([[{...img, image: {assignmentId: 5, page: 'x'}}]])[0][0].image).toBeUndefined();
  });

  it('the point eraser never removes a page image, only formula blocks', () => {
    const a = img.points[0];
    const inside = {x: a.x + 10, y: a.y + 10};
    expect(eraserHitsBlock(img, inside, 12)).toBe(false);
    const formula = {...img, image: undefined};
    expect(eraserHitsBlock(formula, inside, 12)).toBe(true);
  });
});
