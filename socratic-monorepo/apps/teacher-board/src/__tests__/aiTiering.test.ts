import {describe, it, expect} from 'vitest';
import {recognizeWithAi, thinStrokesForUpload} from '../utils/inkConvert';
import type {Stroke} from '../utils/lassoGeometry';

const stroke = (n: number): Stroke => ({
  id: 's',
  color: '#000',
  width: 3,
  points: Array.from({length: n}, (_, i) => ({x: i * 1.234567, y: i * 0.5})),
});

describe('phân tầng nhận dạng: Vision trước, cục bộ dự phòng', () => {
  it('nét gửi lên được thưa bớt, làm tròn, giữ đủ điểm đầu và cuối', () => {
    const out = thinStrokesForUpload([stroke(400)]);
    expect(out[0].points.length).toBeLessThanOrEqual(50);
    expect(out[0].points[0]).toEqual({x: 0, y: 0});
    const last = out[0].points[out[0].points.length - 1];
    expect(last.x).toBeCloseTo(399 * 1.234567, 0);
    expect(String(out[0].points[1].x).length).toBeLessThan(8);
  });

  it('nét ngắn giữ nguyên', () => {
    expect(thinStrokesForUpload([stroke(5)])[0].points).toHaveLength(5);
  });

  it('yêu cầu gửi lên KHÔNG bật mô hình cục bộ làm bước đầu', async () => {
    let sent: Record<string, unknown> = {};
    const fetchImpl = (async (_u: string, init: {body: string}) => {
      sent = JSON.parse(init.body);
      return {ok: true, json: async () => ({lines: [{text: 'con lắc kép', latex: '\\text{con lắc kép}', confidence: 0.9}], confidence: 0.9, model: 'm'})} as unknown as Response;
    }) as unknown as typeof fetch;
    const r = await recognizeWithAi([stroke(30)], {fetchImpl, exportImage: async () => 'data:image/png;base64,AAAA', apiKey: '', openrouterKey: ''});
    expect(r?.lines[0].text).toBe('con lắc kép');
    expect(sent.prefer_offline).toBe(false);
    expect('allow_local_onnx' in sent).toBe(false);
    expect(typeof sent.raw_strokes_json).toBe('string');
    expect((sent.raw_strokes_json as string).length).toBeLessThan(2000);
  });

  it('chỉ chạy cục bộ trước khi được yêu cầu rõ', async () => {
    let sent: Record<string, unknown> = {};
    const fetchImpl = (async (_u: string, init: {body: string}) => {
      sent = JSON.parse(init.body);
      return {ok: false} as unknown as Response;
    }) as unknown as typeof fetch;
    const r = await recognizeWithAi([stroke(30)], {fetchImpl, exportImage: async () => 'x', preferOffline: true, apiKey: '', openrouterKey: ''});
    expect(r).toBeNull();
    expect(sent.prefer_offline).toBe(true);
  });
});
