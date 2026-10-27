import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {createTutorDraftStore} from '../utils/tutorDrafts';

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('retains an uncertain request id across reload but changes it for a different answer', () => {
  const first = createTutorDraftStore('s1');
  const id = first.beginAttempt('p1', 0, 'x=2');
  const restored = createTutorDraftStore('s1');
  expect(restored.beginAttempt('p1', 0, 'x=2')).toBe(id);
  restored.write('p1', 0, 'x=3');
  expect(restored.beginAttempt('p1', 0, 'x=3')).not.toBe(id);
  expect(createTutorDraftStore('s2').read('p1', 0).answer).toBe('');
});

it('keeps in-memory drafts and retry ids when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
  const store = createTutorDraftStore('s1');
  const id = store.beginAttempt('p1', 0, 'x=2');
  expect(store.beginAttempt('p1', 0, 'x=2')).toBe(id);
  expect(store.read('p1', 0).answer).toBe('x=2');
  store.acknowledge('p1', 0, true);
  expect(store.read('p1', 0).answer).toBe('');
});

it('clears submitted ids after acknowledgment and only clears correct drafts', () => {
  const store = createTutorDraftStore('s1');
  const id = store.beginAttempt('p1', 0, 'x=2');
  store.acknowledge('p1', 0, false);
  expect(store.read('p1', 0).answer).toBe('x=2');
  expect(store.beginAttempt('p1', 0, 'x=2')).not.toBe(id);
  store.acknowledge('p1', 0, true);
  expect(createTutorDraftStore('s1').read('p1', 0).answer).toBe('');
});
