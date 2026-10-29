// @types/react-dom chưa cài trong monorepo: khai báo tối thiểu cho createPortal (dùng ở GradeOverlay)
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';
  export function createPortal(children: ReactNode, container: Element | DocumentFragment, key?: string | null): ReactPortal;
}
