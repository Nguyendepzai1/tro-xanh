import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export const addressCatalog=JSON.parse(readFileSync(join(root,'resources','vietnam-addresses.json'),'utf8'));
export const normalizeCity=value=>{
 const normalized=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim().replace(/^(tinh\s+|thanh pho\s+|tp[.\s]*)/,'').trim();
 return ['sai gon','saigon','hcm','ho chi minh'].includes(normalized)?'ho chi minh':normalized;
};
