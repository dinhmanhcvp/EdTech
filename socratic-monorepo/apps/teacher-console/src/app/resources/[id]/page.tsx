'use client';

import React from 'react';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {Shell} from '../../../components/Shell';
import {ResourceEditor} from '../../../components/ResourceEditor';

export default function Page({params}: {params: {id: string}}) {
  return (
    <Shell>
      <Link href="/resources" className="mb-3 flex items-center gap-1 text-sm text-stone-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Tài nguyên
      </Link>
      <ResourceEditor id={params.id} />
    </Shell>
  );
}
