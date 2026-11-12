import React from 'react';

/**
 * Nạp engine mô phỏng khi cần (tách khỏi gói tải lần đầu của bảng). Giống `React.lazy` nhưng khi engine ĐÃ nạp rồi thì dựng ngay, không treo một nhịp:
 * kiểm thử gọi `preload()` trước nên vẫn dựng đồng bộ. Cần một `<Suspense>` bao ngoài; nạp lỗi thì ném lỗi cho hàng rào lỗi gần nhất thay vì treo mãi.
 */
export type LazyEngine<C extends React.ComponentType<any>> = C & {preload: () => Promise<void>};
export function lazyEngine<C extends React.ComponentType<any>>(load: () => Promise<C>): LazyEngine<C> {
  let Loaded: C | null = null;
  let failed: unknown = null;
  let pending: Promise<void> | null = null;
  const preload = (): Promise<void> =>
    (pending ??= load().then(
      (c) => {
        Loaded = c;
      },
      (e) => {
        failed = e ?? new Error('Không nạp được engine mô phỏng');
      },
    ));
  const Wrapper = ((props: React.ComponentProps<C>) => {
    if (failed) throw failed;
    if (!Loaded) throw preload();
    return React.createElement(Loaded as React.ComponentType<any>, props);
  }) as unknown as LazyEngine<C>;
  Wrapper.preload = preload;
  return Wrapper;
}
