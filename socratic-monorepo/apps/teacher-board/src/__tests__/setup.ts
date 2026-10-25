// apps/teacher-board/src/__tests__/setup.ts
import '@testing-library/jest-dom';

// Polyfill HTMLCanvasElement.prototype.getContext for jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextType: string) {
    if (contextType === '2d') {
      return {
        canvas: this,
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        ellipse: () => {},
        bezierCurveTo: () => {},
        quadraticCurveTo: () => {},
        drawImage: () => {},
        stroke: () => {},
        fill: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        fillText: () => {},
        strokeText: () => {},
        measureText: (text: string) => ({ width: text.length * 8 }),
        setLineDash: () => {},
        getLineDash: () => [],
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  } as any;

  HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/webp;base64,mockWebpData';
  };

  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
    callback(new Blob(['mockWebpBytes'], { type: 'image/webp' }));
  };
}

// Polyfill requestAnimationFrame & cancelAnimationFrame
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  };
  window.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}
