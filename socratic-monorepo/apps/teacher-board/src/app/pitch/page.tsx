'use client';
// Bộ slide AXIOMA chỉ dựng phía trình duyệt: số định dạng kiểu Việt (vi-VN) khác nhau giữa Node và trình duyệt.
import dynamic from 'next/dynamic';

export default dynamic(() => import('../../components/pitch/Deck'), {ssr: false});
