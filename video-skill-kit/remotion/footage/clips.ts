import P from './marks/P.json';
import R from './marks/R.json';
import H from './marks/H.json';
import B from './marks/B.json';
import C from './marks/C.json';
import D from './marks/D.json';
import E from './marks/E.json';
// Footage tính năng mới (Launch v3, tools/clips4.mjs)
import Nconv from './marks/Nconv.json';
import Noxyz from './marks/Noxyz.json';
import Nrevolve from './marks/Nrevolve.json';
import Nlattice from './marks/Nlattice.json';
import Nsn2 from './marks/Nsn2.json';
import Ncyclo from './marks/Ncyclo.json';
import Netc from './marks/Netc.json';
import Nlotka from './marks/Nlotka.json';
import Npendulum from './marks/Npendulum.json';
import Nholo from './marks/Nholo.json';
import type {ClipData} from './types';

export const CLIPS: Record<string, ClipData> = {P, R, H, B, C, D, E, Nconv, Noxyz, Nrevolve, Nlattice, Nsn2, Ncyclo, Netc, Nlotka, Npendulum, Nholo} as unknown as Record<string, ClipData>;
