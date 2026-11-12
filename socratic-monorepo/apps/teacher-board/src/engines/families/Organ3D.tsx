'use client';

import React from 'react';
import type {P, S} from '../../utils/presets/types';
import {Stage3D} from './Stage3D';
import {ALL_ORGAN_SCENES as ORGAN_SCENES} from './Scenes3DOrgans2';

/** Bản 3D của sơ đồ giải phẫu (chạm chọn bộ phận) và của chuỗi bước (nguyên phân): tải lười, dùng chung sân khấu với SceneLab. */
const Organ3D: React.FC<{id: string; p: P; s: S; onPick?: (id: string | null) => void; onFail: () => void}> = ({id, p, s, onPick, onFail}) => <Stage3D def={ORGAN_SCENES[id]} p={p} t={0} s={s} onPick={onPick} onFail={onFail} />;
export default Organ3D;
