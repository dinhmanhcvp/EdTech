import {ADVANCED} from './advanced';
import {BEC} from './bec';
import {LIGO} from './ligo';
import {MATTERWAVE} from './matterwave';
import {THPT_CHEM_BIO} from './thptChemBio';
import {THPT_PHYS} from './thptPhys';
import type {SimSpec} from './types';

/** Các bài mô phỏng thanh trượt trong phòng thực hành tay: bài THPT (bám SGK) trước, bài đỉnh cao sau. */
export const SIMS: SimSpec[] = [...THPT_PHYS, ...THPT_CHEM_BIO, MATTERWAVE, LIGO, BEC, ...ADVANCED];
export const SIM_BY_ID: Record<string, SimSpec> = Object.fromEntries(SIMS.map((s) => [s.id, s]));
