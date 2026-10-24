import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDatabase, seed, hashPassword, verifyPassword, root, normalizeVi } from './db.mjs';
import { upgradeRoutes } from './upgrade.mjs';
import { communityRoutes } from './community.mjs';
import {normalizeCity} from './addresses.mjs';

class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(status,message)=>{throw new HttpError(status,message);};
const publicUser=u=>u?{id:u.id,name:u.name,email:u.email,phone:u.phone,role:u.role,approved:!!u.approved}:null;
const parseListing=r=>({...r,amenities:JSON.parse(r.amenities),images:JSON.parse(r.images)});
const publicListing=r=>{const {review_note,owner_email,owner_approved,owner_active,...visible}=parseListing(r);return visible;};
const text=(v,name,min=1,max=500)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(400,`${name}: cần từ ${min} đến ${max} ký tự.`);return v.trim();};
const num=(v,name,min=0,max=1e9)=>{if(typeof v!=='number'&&(typeof v!=='string'||!/^\s*-?(?:\d+(?:\.\d+)?|\.\d+)\s*$/.test(v)))fail(400,`${name} không hợp lệ.`);const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)fail(400,`${name} không hợp lệ.`);return n;};
const integer=(v,name,min=0,max=1e9)=>{const n=num(v,name,min,max);if(!Number.isSafeInteger(n))fail(400,`${name} phải là số nguyên.`);return n;};
const email=v=>{const s=text(v,'Email',5,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail(400,'Email không hợp lệ.');return s;};
const phone=v=>{const s=text(v,'Số điện thoại',10,15);if(!/^\+?\d{10,14}$/.test(s))fail(400,'Số điện thoại không hợp lệ.');return s;};
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function createApp({db=openDatabase(),seedDemo=true,uploadsDir=join(root,'data','uploads')}={}) {
 if(seedDemo)seed(db); mkdirSync(uploadsDir,{recursive:true});
 const limits=new Map();
 const audit=(u,action,target)=>db.prepare('INSERT INTO audit_logs(actor_id,action,target) VALUES(?,?,?)').run(u.id,action,String(target));
 function guard(ctx,role){if(!ctx.user)fail(401,'Vui lòng đăng nhập.');if(role&&ctx.user.role!==role)fail(403,'Bạn không có quyền thực hiện thao tác này.');return ctx.user;}
 function owner(ctx){const u=guard(ctx,'owner');if(!u.approved)fail(403,'Chủ trọ cần được quản trị viên cấp quyền trước.');return u;}
 function ownedListing(ctx,id){const u=owner(ctx);const l=db.prepare('SELECT * FROM listings WHERE id=? AND owner_id=?').get(id,u.id);if(!l)fail(404,'Không tìm thấy phòng của bạn.');return l;}
 function tx(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 const upgrade=upgradeRoutes({db,guard,owner,fail,text,integer,tx,audit,publicListing});
 const community=communityRoutes({db,guard,fail,text,integer,tx,audit,publicListing});
 function listingBody(b,existingImages=[]){
 const allowed=['Wifi','Chỗ để xe','Điều hòa','Nội thất','Gác lửng','Ban công','Thang máy','Cho nuôi thú cưng'];
 if(!Array.isArray(b.amenities)||b.amenities.some(x=>!allowed.includes(x)))fail(400,'Tiện ích không hợp lệ.');
 if(!Array.isArray(b.images)||b.images.length>6||b.images.some(x=>typeof x!=='string'||(!existingImages.includes(x)&&!(/^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(x)&&existsSync(join(uploadsDir,x.split('/').pop()))))))fail(400,'Vui lòng sử dụng ảnh được tải lên từ website.');
 return [text(b.title,'Tiêu đề',10,150),text(b.description,'Mô tả',30,6000),text(b.address,'Địa chỉ',5,200),text(b.district,'Quận huyện',2,80),text(b.city,'Thành phố',2,80),integer(b.price,'Giá thuê',100000,100000000),num(b.area,'Diện tích',5,1000),integer(b.deposit,'Tiền cọc',0,300000000),integer(b.electricity,'Giá điện',0,100000),integer(b.water,'Giá nước',0,1000000),JSON.stringify([...new Set(b.amenities)]),JSON.stringify(b.images)];
 }
 async function api(req,res,url,ctx,b){
 const method=req.method,path=url.pathname;
 const upgraded=await upgrade(req,res,url,ctx,b);if(upgraded!==undefined)return upgraded;
 const extra=community(req,url,ctx,b);if(extra!==undefined)return extra;
 if(method==='GET'&&path==='/api/me')return {user:publicUser(ctx.user),csrf:ctx.session.csrf,demo:seedDemo};
 if(method==='POST'&&path==='/api/register'){
 const name=text(b.name,'Họ tên',2,100),mail=email(b.email),tel=phone(b.phone);
 if(typeof b.password!=='string'||b.password.length<10||b.password.length>128||!b.password.trim())fail(400,'Mật khẩu cần từ 10 đến 128 ký tự.');const password=b.password;
 if(!['seeker','owner'].includes(b.role))fail(400,'Vai trò không hợp lệ.');
 if(db.prepare('SELECT id FROM users WHERE email=?').get(mail))fail(409,'Email đã được sử dụng.');
 const result=db.prepare('INSERT INTO users(name,email,phone,password_hash,role,approved) VALUES(?,?,?,?,?,?)').run(name,mail,tel,hashPassword(password),b.role,b.role==='seeker'?1:0);
 audit({id:Number(result.lastInsertRowid)},'register',b.role);return {message:'Đăng ký thành công. Bạn có thể đăng nhập.'};
 }
 if(method==='POST'&&path==='/api/login'){
 const key=req.socket.remoteAddress,now=Date.now();let rate=limits.get(key);if(!rate||rate.until<now){rate={count:0,until:now+600000};limits.set(key,rate);}if(rate.count>=15)fail(429,'Thử đăng nhập quá nhiều lần. Vui lòng đợi 10 phút.');
 const u=db.prepare('SELECT * FROM users WHERE email=?').get(typeof b.email==='string'?b.email.toLowerCase().trim():'');
 if(!u||!u.active||typeof b.password!=='string'||b.password.length>128||!verifyPassword(b.password,u.password_hash)){rate.count++;fail(401,'Email hoặc mật khẩu không đúng.');}
 limits.delete(key);db.prepare('DELETE FROM sessions WHERE token=?').run(ctx.token);
 const sessionToken=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
 db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(sessionToken).digest('hex'),u.id,csrf,Date.now()+86400000);
 res.setHeader('Set-Cookie',cookie(sessionToken));return {user:publicUser(u),csrf};
 }
 if(method==='POST'&&path==='/api/logout'){db.prepare('DELETE FROM sessions WHERE token=?').run(ctx.token);res.setHeader('Set-Cookie',cookie('',0));return {message:'Đã đăng xuất.'};}
 if(method==='GET'&&path==='/api/listings'){
 let query="SELECT l.*,u.name owner_name FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.status='published' AND l.occupancy='available' AND u.active=1 AND u.approved=1 AND NOT EXISTS (SELECT 1 FROM rental_deals d WHERE d.listing_id=l.id AND d.status IN ('accepted','funded'))",args=[];
 for(const key of ['city','district'])if(url.searchParams.get(key)){query+=` AND ${key==='city'?'normalize_city':'normalize_vi'}(l.${key})=?`;args.push(key==='city'?normalizeCity(url.searchParams.get(key)):normalizeVi(url.searchParams.get(key).trim()));}
 const q=normalizeVi((url.searchParams.get('q')||'').trim().slice(0,100));if(q){query+=" AND (normalize_vi(l.title) LIKE ? ESCAPE '\\' OR normalize_vi(l.address) LIKE ? ESCAPE '\\' OR normalize_vi(l.district) LIKE ? ESCAPE '\\' OR normalize_vi(l.city) LIKE ? ESCAPE '\\')";args.push(...Array(4).fill(`%${q.replace(/[\\%_]/g,'\\$&')}%`));}
 if(url.searchParams.get('min')&&url.searchParams.get('max')&&num(url.searchParams.get('min'),'Giá thấp nhất')>num(url.searchParams.get('max'),'Giá cao nhất'))fail(400,'Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.');
 for(const [key,operator] of [['min','>='],['max','<=']])if(url.searchParams.has(key)&&url.searchParams.get(key)!==''){query+=` AND l.price${operator}?`;args.push(num(url.searchParams.get(key),'Mức giá'));}
 if(url.searchParams.get('area')){query+=' AND l.area>=?';args.push(num(url.searchParams.get('area'),'Diện tích'));}
 const filters=url.searchParams.getAll('amenity').filter(Boolean);if(filters.length>8)fail(400,'Tối đa 8 tiện ích.');for(const a of filters){query+=' AND EXISTS (SELECT 1 FROM json_each(l.amenities) WHERE value=?)';args.push(a);}
 const sort={newest:'l.id DESC',price_asc:'l.price ASC,l.id DESC',price_desc:'l.price DESC,l.id DESC'}[url.searchParams.get('sort')]||'l.id DESC';
 const total=db.prepare(`SELECT count(*) n FROM (${query})`).get(...args).n;
 const page=integer(url.searchParams.get('page')||1,'Trang',1,100000);
 return {items:db.prepare(`${query} ORDER BY ${sort} LIMIT 12 OFFSET ?`).all(...args,(page-1)*12).map(publicListing),total,page,pages:Math.ceil(total/12)};
 }
 let match=path.match(/^\/api\/listings\/(\d+)$/);
 if(match&&method==='GET'){
 const l=db.prepare("SELECT l.*,EXISTS(SELECT 1 FROM rental_deals d WHERE d.listing_id=l.id AND d.status IN ('accepted','funded')) reserved,u.name owner_name,u.phone owner_phone,u.email owner_email,u.approved owner_approved,u.active owner_active FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=?").get(+match[1]);
 if(!l||(!(l.status==='published'&&l.owner_active&&l.owner_approved)&&ctx.user?.id!==l.owner_id&&ctx.user?.role!=='admin'))fail(404,'Tin không tồn tại hoặc chưa được duyệt.');return ctx.user?.id===l.owner_id||ctx.user?.role==='admin'?parseListing(l):publicListing(l);
 }
 if(method==='POST'&&path==='/api/owner-requests'){
 const u=guard(ctx,'owner');if(u.approved)fail(409,'Tài khoản đã được cấp quyền.');
 if(db.prepare("SELECT id FROM owner_requests WHERE user_id=? AND status='pending'").get(u.id))fail(409,'Bạn đã có yêu cầu đang chờ xử lý.');
 const result=db.prepare('INSERT INTO owner_requests(user_id,message) VALUES(?,?)').run(u.id,text(b.message,'Nội dung liên hệ',20,2000));audit(u,'request_owner_permission',result.lastInsertRowid);return {message:'Đã gửi liên hệ. Quản trị viên sẽ xem xét và cấp quyền.'};
 }
 if(method==='GET'&&path==='/api/owner-requests'){const u=guard(ctx,'owner');return db.prepare('SELECT * FROM owner_requests WHERE user_id=? ORDER BY id DESC').all(u.id);}
 if(method==='POST'&&path==='/api/uploads'){
 owner(ctx);if(typeof b.data!=='string'||b.data.length>7000000)fail(400,'Ảnh tối đa 5 MB.');
 const m=b.data.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);if(!m)fail(400,'Chỉ chấp nhận JPEG, PNG hoặc WebP.');
 const bytes=Buffer.from(m[2],'base64');let kind=bytes.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpg':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':null;
 if(!kind||bytes.length>5*1024*1024||bytes.length<16)fail(400,'Nội dung ảnh không hợp lệ.');
 const name=randomBytes(16).toString('hex')+'.'+kind;writeFileSync(join(uploadsDir,name),bytes);return {url:'/uploads/'+name};
 }
 if(method==='POST'&&path==='/api/listings'){
 const u=owner(ctx),values=listingBody(b);const r=db.prepare('INSERT INTO listings(owner_id,title,description,address,district,city,price,area,deposit,electricity,water,amenities,images) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(u.id,...values);audit(u,'create_listing',r.lastInsertRowid);return {id:Number(r.lastInsertRowid),message:'Đã gửi tin để quản trị viên duyệt.'};
 }
 if(match&&method==='PUT'){
 const l=ownedListing(ctx,+match[1]);if(db.prepare("SELECT id FROM rental_deals WHERE listing_id=? AND status IN ('accepted','funded')").get(l.id))fail(409,'Phòng đang làm thủ tục cọc. Hủy hoặc xử lý đề nghị trước khi sửa tin.');const values=listingBody(b,JSON.parse(l.images));if(l.occupancy==='rented')fail(409,'Phòng đang cho thuê. Kết thúc hợp đồng trước khi sửa tin.');
 db.prepare("UPDATE listings SET title=?,description=?,address=?,district=?,city=?,price=?,area=?,deposit=?,electricity=?,water=?,amenities=?,images=?,status='pending',review_note='' WHERE id=?").run(...values,l.id);audit(ctx.user,'edit_listing',l.id);return {message:'Đã cập nhật. Tin cần được duyệt lại.'};
 }
 match=path.match(/^\/api\/listings\/(\d+)\/hide$/);
 if(match&&method==='POST'){const l=ownedListing(ctx,+match[1]);if(db.prepare("SELECT id FROM rental_deals WHERE listing_id=? AND status IN ('accepted','funded')").get(l.id))fail(409,'Phòng đang làm thủ tục cọc. Xử lý đề nghị trước khi ẩn tin.');db.prepare("UPDATE listings SET status='hidden' WHERE id=?").run(l.id);audit(ctx.user,'hide_listing',l.id);return {message:'Đã ẩn tin.'};}
 if(method==='GET'&&path==='/api/favorites'){const u=guard(ctx,'seeker');return db.prepare("SELECT l.*,u.name owner_name FROM favorites f JOIN listings l ON l.id=f.listing_id JOIN users u ON u.id=l.owner_id WHERE f.user_id=? AND l.status='published' AND u.active=1 AND u.approved=1 ORDER BY l.id DESC").all(u.id).map(publicListing);}
 match=path.match(/^\/api\/favorites\/(\d+)$/);
 if(match&&['POST','DELETE'].includes(method)){
 const u=guard(ctx,'seeker'),id=+match[1];if(method==='DELETE')db.prepare('DELETE FROM favorites WHERE user_id=? AND listing_id=?').run(u.id,id);else{if(!db.prepare("SELECT l.id FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=? AND l.status='published' AND u.active=1 AND u.approved=1").get(id))fail(404,'Tin không còn hiển thị.');db.prepare('INSERT OR IGNORE INTO favorites VALUES(?,?)').run(u.id,id);}return {message:'Đã cập nhật tin đã lưu.'};
 }
 if(method==='POST'&&path==='/api/inquiries'){
 const u=guard(ctx,'seeker'),id=integer(b.listing_id,'Mã tin',1);if(!db.prepare("SELECT l.id FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=? AND l.status='published' AND l.occupancy='available' AND u.active=1 AND u.approved=1").get(id))fail(404,'Phòng hiện không còn nhận liên hệ.');
 let date='';if(b.visit_at){if(typeof b.visit_at!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(b.visit_at)||!validDate(b.visit_at.slice(0,10))||!Number.isFinite(Date.parse(b.visit_at+'+07:00'))||Date.parse(b.visit_at+'+07:00')<=Date.now())fail(400,'Lịch xem cần ngày có thật và thời điểm trong tương lai.');date=b.visit_at;}
 db.prepare('INSERT INTO inquiries(listing_id,user_id,message,visit_at) VALUES(?,?,?,?)').run(id,u.id,text(b.message,'Lời nhắn',10,2000),date);return {message:'Đã gửi yêu cầu liên hệ đến chủ trọ.'};
 }
 if(method==='GET'&&path==='/api/inquiries'){
 const u=guard(ctx);if(!['owner','seeker'].includes(u.role))fail(403,'Vai trò không phù hợp.');
 return db.prepare(`SELECT i.*,l.title,u.name,u.phone,u.email FROM inquiries i JOIN listings l ON l.id=i.listing_id JOIN users u ON u.id=i.user_id WHERE ${u.role==='owner'?'l.owner_id':'i.user_id'}=? ORDER BY i.id DESC`).all(u.id);
 }
 match=path.match(/^\/api\/inquiries\/(\d+)$/);
 if(match&&method==='PATCH'){const u=owner(ctx);const i=db.prepare('SELECT i.id FROM inquiries i JOIN listings l ON l.id=i.listing_id WHERE i.id=? AND l.owner_id=?').get(+match[1],u.id);if(!i)fail(404,'Không tìm thấy yêu cầu.');if(!['confirmed','closed'].includes(b.status))fail(400,'Trạng thái không hợp lệ.');db.prepare('UPDATE inquiries SET status=? WHERE id=?').run(b.status,i.id);return {message:'Đã cập nhật yêu cầu.'};}
 if(method==='GET'&&path==='/api/owner/listings'){const u=owner(ctx);return db.prepare('SELECT * FROM listings WHERE owner_id=? ORDER BY id DESC').all(u.id).map(parseListing);}
 if(method==='POST'&&path==='/api/leases'){
 const l=ownedListing(ctx,integer(b.listing_id,'Phòng',1));
 if(!validDate(b.start_date)||!validDate(b.end_date)||b.end_date<=b.start_date)fail(400,'Ngày hợp đồng không hợp lệ.');
 const values=[l.id,text(b.tenant_name,'Tên người thuê',2,100),phone(b.tenant_phone),b.tenant_email?email(b.tenant_email):'',b.start_date,b.end_date,integer(b.rent,'Tiền thuê',100000,100000000),integer(b.deposit,'Tiền cọc',0,300000000)];
 const tenant=values[3]?db.prepare("SELECT id FROM users WHERE email=? AND role='seeker' AND active=1").get(values[3]):null;
 if(values[3]&&!tenant)fail(400,'Email người thuê cần thuộc tài khoản người tìm phòng đã đăng ký và đang hoạt động. Có thể để trống email nếu chỉ quản lý nội bộ.');
 const reserved=db.prepare("SELECT * FROM rental_deals WHERE listing_id=? AND status IN ('accepted','funded')").get(l.id);
 if(reserved&&(reserved.status!=='funded'||tenant?.id!==reserved.seeker_id||values[6]!==reserved.rent||values[7]!==reserved.deposit))fail(409,'Phòng đang có đề nghị cọc. Chỉ lập hợp đồng đúng khách, giá và cọc đã ghi nhận; hoặc hủy/hoàn đề nghị trước.');
 return tx(()=>{if(db.prepare("SELECT id FROM leases WHERE listing_id=? AND status='active'").get(l.id))fail(409,'Phòng đã có hợp đồng hiệu lực.');const r=db.prepare('INSERT INTO leases(listing_id,tenant_name,tenant_phone,tenant_email,start_date,end_date,rent,deposit,tenant_user_id) VALUES(?,?,?,?,?,?,?,?,?)').run(...values,tenant?.id??null);db.prepare("UPDATE listings SET occupancy='rented' WHERE id=?").run(l.id);audit(ctx.user,'create_lease',r.lastInsertRowid);return {message:'Đã tạo hợp đồng và cập nhật phòng đang thuê.'};});
 }
 if(method==='GET'&&path==='/api/leases'){
 const u=guard(ctx);if(u.role==='owner'){owner(ctx);return db.prepare('SELECT c.*,l.title FROM leases c JOIN listings l ON l.id=c.listing_id WHERE l.owner_id=? ORDER BY c.id DESC').all(u.id);}
 if(u.role==='seeker')return db.prepare('SELECT c.*,l.title FROM leases c JOIN listings l ON l.id=c.listing_id WHERE c.tenant_user_id=? ORDER BY c.id DESC').all(u.id);fail(403,'Vai trò không phù hợp.');
 }
 match=path.match(/^\/api\/leases\/(\d+)\/end$/);
 if(match&&method==='POST'){const u=owner(ctx);return tx(()=>{const c=db.prepare("SELECT c.* FROM leases c JOIN listings l ON l.id=c.listing_id WHERE c.id=? AND l.owner_id=? AND c.status='active'").get(+match[1],u.id);if(!c)fail(404,'Hợp đồng không tồn tại hoặc đã kết thúc.');if(db.prepare("SELECT id FROM rental_deals WHERE listing_id=? AND status='funded'").get(c.listing_id))fail(409,'Khách cần hoàn tất xác nhận nhận phòng trước khi kết thúc hợp đồng trong luồng cọc thử nghiệm.');db.prepare("UPDATE leases SET status='ended' WHERE id=?").run(c.id);db.prepare("UPDATE listings SET occupancy='available' WHERE id=?").run(c.listing_id);audit(u,'end_lease',c.id);return {message:'Đã kết thúc hợp đồng.'};});}
 if(method==='POST'&&path==='/api/invoices'){
 const u=owner(ctx);const c=db.prepare("SELECT c.*,l.electricity,l.water FROM leases c JOIN listings l ON l.id=c.listing_id WHERE c.id=? AND l.owner_id=? AND c.status='active'").get(integer(b.lease_id,'Hợp đồng',1),u.id);if(!c)fail(404,'Không tìm thấy hợp đồng đang hiệu lực.');
 if(typeof b.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.month)||b.month<c.start_date.slice(0,7)||b.month>c.end_date.slice(0,7))fail(400,'Tháng hóa đơn phải nằm trong thời hạn hợp đồng.');
 const e=num(b.electricity_usage,'Số điện',0,100000),w=num(b.water_usage,'Số nước',0,100000),fee=integer(b.service_fee,'Phí dịch vụ',0,10000000),total=Math.round(c.rent+e*c.electricity+w*c.water+fee);
 if(db.prepare('SELECT id FROM invoices WHERE lease_id=? AND month=?').get(c.id,b.month))fail(409,'Tháng này đã có hóa đơn.');
 const r=db.prepare('INSERT INTO invoices(lease_id,month,rent,electricity_usage,electricity_rate,water_usage,water_rate,service_fee,total) VALUES(?,?,?,?,?,?,?,?,?)').run(c.id,b.month,c.rent,e,c.electricity,w,c.water,fee,total);audit(u,'create_invoice',r.lastInsertRowid);return {message:'Đã tạo hóa đơn.',total};
 }
 if(method==='GET'&&path==='/api/invoices'){
 const u=guard(ctx);if(!['owner','seeker'].includes(u.role))fail(403,'Vai trò không phù hợp.');if(u.role==='owner')owner(ctx);
 return db.prepare(`SELECT i.*,c.tenant_name,l.title FROM invoices i JOIN leases c ON c.id=i.lease_id JOIN listings l ON l.id=c.listing_id WHERE ${u.role==='owner'?'l.owner_id=?':'c.tenant_user_id=?'} ORDER BY i.month DESC,i.id DESC`).all(u.id);
 }
 match=path.match(/^\/api\/invoices\/(\d+)\/paid$/);
 if(match&&method==='POST'){const u=owner(ctx);const i=db.prepare('SELECT i.* FROM invoices i JOIN leases c ON c.id=i.lease_id JOIN listings l ON l.id=c.listing_id WHERE i.id=? AND l.owner_id=?').get(+match[1],u.id);if(!i)fail(404,'Không tìm thấy hóa đơn.');if(i.status==='paid')fail(409,'Hóa đơn đã được thanh toán.');if(db.prepare("SELECT id FROM payments WHERE invoice_id=? AND status='pending'").get(i.id))fail(409,'Hóa đơn đang chờ đối soát giao dịch trên website.');db.prepare("UPDATE invoices SET status='paid',paid_at=CURRENT_TIMESTAMP WHERE id=?").run(i.id);audit(u,'mark_invoice_paid',i.id);return {message:'Đã ghi nhận thanh toán thủ công.'};}
 if(method==='GET'&&path==='/api/admin'){
 guard(ctx,'admin');return {users:db.prepare('SELECT id,name,email,phone,role,approved,active,created_at FROM users ORDER BY id DESC').all(),requests:db.prepare('SELECT r.*,u.name,u.phone,u.email FROM owner_requests r JOIN users u ON u.id=r.user_id ORDER BY r.id DESC').all(),listings:db.prepare('SELECT l.*,u.name owner_name FROM listings l JOIN users u ON u.id=l.owner_id ORDER BY l.id DESC').all().map(parseListing),logs:db.prepare('SELECT a.*,u.name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100').all()};
 }
 match=path.match(/^\/api\/admin\/requests\/(\d+)$/);
 if(match&&method==='PATCH'){
 const u=guard(ctx,'admin');if(!['approved','rejected'].includes(b.status))fail(400,'Quyết định không hợp lệ.');const note=text(b.note,'Ghi chú xác minh',5,1000);
 return tx(()=>{const r=db.prepare("SELECT r.* FROM owner_requests r JOIN users u ON u.id=r.user_id WHERE r.id=? AND r.status='pending' AND u.active=1").get(+match[1]);if(!r)fail(409,'Yêu cầu đã xử lý hoặc tài khoản bị khóa.');if(b.status==='approved'&&!db.prepare("SELECT id FROM owner_verifications WHERE user_id=? AND status='approved'").get(r.user_id))fail(409,'Cần duyệt hồ sơ minh chứng trong mục Xác minh chủ trọ trước.');db.prepare('UPDATE owner_requests SET status=?,note=?,reviewed_by=? WHERE id=?').run(b.status,note,u.id,r.id);db.prepare('UPDATE users SET approved=? WHERE id=?').run(b.status==='approved'?1:0,r.user_id);audit(u,'owner_'+b.status,r.user_id);return {message:'Đã xử lý yêu cầu cấp quyền.'};});
 }
 match=path.match(/^\/api\/admin\/listings\/(\d+)$/);
 if(match&&method==='PATCH'){
 const u=guard(ctx,'admin');if(!['published','rejected','hidden'].includes(b.status))fail(400,'Trạng thái không hợp lệ.');const note=text(b.note,'Ghi chú duyệt',5,1000);
 const l=db.prepare('SELECT l.*,u.approved,u.active FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=?').get(+match[1]);if(!l)fail(404,'Không tìm thấy tin.');if(b.status==='published'&&(!l.approved||!l.active))fail(409,'Chủ tin chưa được cấp quyền hoặc bị khóa.');db.prepare('UPDATE listings SET status=?,review_note=? WHERE id=?').run(b.status,note,l.id);audit(u,'listing_'+b.status,l.id);return {message:'Đã cập nhật kiểm duyệt tin.'};
 }
 match=path.match(/^\/api\/admin\/users\/(\d+)$/);
 if(match&&method==='PATCH'){const u=guard(ctx,'admin'),id=+match[1];const target=db.prepare('SELECT * FROM users WHERE id=?').get(id);if(!target)fail(404,'Không tìm thấy tài khoản.');if(target.role==='admin')fail(400,'Không thể khóa quản trị viên.');if(typeof b.active!=='boolean')fail(400,'Trạng thái không hợp lệ.');tx(()=>{db.prepare('UPDATE users SET active=? WHERE id=?').run(b.active?1:0,id);if(!b.active)db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);audit(u,b.active?'unlock_user':'lock_user',id);});return {message:'Đã cập nhật tài khoản.'};}
 fail(404,'Đường dẫn không tồn tại.');
 }
 const cookie=(token,maxAge=86400)=>`sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.COOKIE_SECURE==='1'?'; Secure':''}`;
 const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: https://images.unsplash.com; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
 let rawToken=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sid='))?.slice(4)||'';
 let token=createHash('sha256').update(rawToken).digest('hex'),session=db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(token,Date.now());
 if(!session){rawToken=randomBytes(32).toString('hex');token=createHash('sha256').update(rawToken).digest('hex');session={token,user_id:null,csrf:randomBytes(32).toString('hex'),expires:Date.now()+86400000};db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(token,null,session.csrf,session.expires);res.setHeader('Set-Cookie',cookie(rawToken));}
 const user=session.user_id?db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(session.user_id):null;
 let b={};if(!['GET','HEAD'].includes(req.method)){
 if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{fail(403,'Nguồn yêu cầu không hợp lệ.');}if(origin.host!==req.headers.host)fail(403,'Nguồn yêu cầu không hợp lệ.');}
 if(req.headers['x-csrf-token']!==session.csrf)fail(403,'Phiên bảo mật đã thay đổi. Vui lòng tải lại trang.');
 if(!String(req.headers['content-type']).startsWith('application/json'))fail(415,'Yêu cầu phải dùng JSON.');
 let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>7500000)fail(413,'Dữ liệu gửi lên quá lớn.');chunks.push(chunk);}try{b=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'JSON không hợp lệ.');}if(!b||Array.isArray(b)||typeof b!=='object')fail(400,'Dữ liệu không hợp lệ.');
 }
 const result=await api(req,res,url,{token,session,user},b);res.end(JSON.stringify(result));return;
 }
 if(!['GET','HEAD'].includes(req.method))fail(405,'Phương thức không được hỗ trợ.');
 let file;
 if(url.pathname.startsWith('/uploads/')){if(!/^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(url.pathname))fail(404,'Không tìm thấy ảnh.');file=join(uploadsDir,url.pathname.split('/').pop());}
 else{const path=decodeURIComponent(url.pathname);file=resolve(root,'public','.'+path);const prefix=resolve(root,'public')+sep;if(file!==resolve(root,'public')&&!file.startsWith(prefix))fail(403,'Không được truy cập.');if(!extname(path))file=join(root,'public','index.html');}
 if(!existsSync(file))fail(404,'Không tìm thấy tệp.');
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
 res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(req.method==='HEAD'?undefined:readFileSync(file));
 }catch(e){const status=e instanceof URIError?400:e.status||500;if(status===500)console.error(e);res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:e instanceof URIError?'Đường dẫn mã hóa không hợp lệ.':e.status?e.message:'Có lỗi hệ thống. Vui lòng thử lại.'}));}
 });
 return {server,db};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {server,db}=createApp({seedDemo:process.env.DEMO!=='0'}),port=Number(process.env.PORT||3530);
 server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Trọ Xanh đang chạy tại http://localhost:${port}`));
 const stop=()=>server.close(()=>{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();process.exit(0);});process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
