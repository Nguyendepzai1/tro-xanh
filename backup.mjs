import {backup} from 'node:sqlite';
import {mkdirSync,cpSync} from 'node:fs';
import {join} from 'node:path';
import {openDatabase,root} from './db.mjs';
const folder=join(root,'data','backups',new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(folder,{recursive:true});
const db=openDatabase();
try{await backup(db,join(folder,'tro-xanh.db'));try{cpSync(join(root,'data','uploads'),join(folder,'uploads'),{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}console.log('Đã sao lưu database và ảnh tại: '+folder);}finally{db.close();}
