import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import {normalizeCity} from './addresses.mjs';
export const root = dirname(fileURLToPath(import.meta.url));
export const normalizeVi=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export function hashPassword(value) {
 const salt=randomBytes(16).toString('hex');
 return `${salt}:${scryptSync(value,salt,64).toString('hex')}`;
}
export function verifyPassword(value, stored) {
 try { const [salt,hash]=stored.split(':'); const actual=scryptSync(value,salt,64); const expected=Buffer.from(hash,'hex'); return actual.length===expected.length&&timingSafeEqual(actual,expected); } catch { return false; }
}
export function openDatabase(path=process.env.DB_PATH||join(root,'data','tro-xanh.db')) {
 if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path); db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 db.exec(readFileSync(join(root,'schema.sql'),'utf8'));
 db.function('normalize_vi',{deterministic:true},normalizeVi);
 db.function('normalize_city',{deterministic:true},normalizeCity);
 if(!db.prepare('PRAGMA table_info(leases)').all().some(c=>c.name==='tenant_user_id')){
  db.exec('BEGIN IMMEDIATE');
  try{db.exec("ALTER TABLE leases ADD COLUMN tenant_user_id INTEGER REFERENCES users(id); UPDATE leases SET tenant_user_id=(SELECT id FROM users WHERE users.email=leases.tenant_email COLLATE NOCASE AND users.role='seeker') WHERE tenant_email<>''; PRAGMA user_version=2; COMMIT;");}catch(e){db.exec('ROLLBACK');throw e;}
 }
 if(db.prepare('PRAGMA user_version').get().user_version<2)db.exec('PRAGMA user_version=2');
 db.exec('BEGIN IMMEDIATE');
 try{db.exec(readFileSync(join(root,'upgrade.sql'),'utf8'));if(db.prepare('PRAGMA user_version').get().user_version<3)db.exec('PRAGMA user_version=3');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 db.exec('BEGIN IMMEDIATE');
 try{db.exec(readFileSync(join(root,'community.sql'),'utf8'));if(db.prepare('PRAGMA user_version').get().user_version<4)db.exec('PRAGMA user_version=4');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 return db;
}
export function seed(db) {
 if(db.prepare('SELECT count(*) n FROM users').get().n) return;
 const add=db.prepare('INSERT INTO users(name,email,phone,password_hash,role,approved) VALUES(?,?,?,?,?,?)');
 const accounts=[['Quản trị Trọ Xanh','admin@troxanh.local','0900000001','Admin@12345','admin',1],['Nguyễn Minh Anh','chutro@troxanh.local','0900000002','ChuTro@12345','owner',1],['Trần Hà Linh','timphong@troxanh.local','0900000003','TimPhong@12345','seeker',1],['Lê Quốc Huy','choduyet@troxanh.local','0900000004','ChoDuyet@12345','owner',0]];
 db.exec('BEGIN');
 try {
 for(const a of accounts) add.run(a[0],a[1],a[2],hashPassword(a[3]),a[4],a[5]);
 db.prepare('INSERT INTO owner_requests(user_id,message) VALUES(4,?)').run('Tôi có 6 phòng tại Liên Chiểu, Đà Nẵng. Nhờ quản trị viên liên hệ xác minh và cấp quyền đăng tin.');
 const photos=['photo-1522708323590-d24dbb6b0267','photo-1502672260266-1c1ef2d93688','photo-1484154218962-a197022b5858','photo-1493809842364-78817add7ffb','photo-1560448204-e02f11c3d0e2','photo-1512918728675-ed5a9ecdebfd'];
 const samples=[['Studio đón nắng, có ban công riêng','Hải Châu','Đà Nẵng','48 Nguyễn Văn Linh',3200000,28],['Phòng gác lửng gần Đại học Duy Tân','Thanh Khê','Đà Nẵng','21 Hà Huy Tập',2400000,24],['Căn hộ nhỏ đầy đủ nội thất','Sơn Trà','Đà Nẵng','76 Ngô Quyền',4500000,35],['Phòng thoáng, giờ giấc tự do','Liên Chiểu','Đà Nẵng','15 Âu Cơ',1800000,20],['Studio yên tĩnh giữa lòng thành phố','Bình Thạnh','TP. Hồ Chí Minh','112 Nguyễn Xí',4200000,30],['Phòng có cửa sổ gần trường đại học','Cầu Giấy','Hà Nội','36 Xuân Thủy',2800000,22]];
 const stmt=db.prepare('INSERT INTO listings(owner_id,title,description,address,district,city,price,area,deposit,electricity,water,amenities,images,status) VALUES(2,?,?,?,?,?,?,?,?,?,?,?,?,?)');
 samples.forEach((s,i)=>stmt.run(s[0],'Phòng sạch sẽ, nhiều ánh sáng tự nhiên. Khu dân cư yên tĩnh, thuận tiện đi học và đi làm. Có khu để xe và lối đi riêng. Liên hệ đặt lịch xem phòng trước khi đến. Thông tin và ảnh trong bản khởi tạo dùng để minh họa đồ án.',s[3],s[1],s[2],s[4],s[5],s[4],3500,15000,JSON.stringify(['Wifi','Chỗ để xe',...(i%2===0?['Điều hòa','Nội thất']:['Gác lửng'])]),JSON.stringify([`https://images.unsplash.com/${photos[i]}?auto=format&fit=crop&w=1000&q=85`]),'published'));
 db.exec('COMMIT');
 } catch(e){db.exec('ROLLBACK');throw e;}
}
