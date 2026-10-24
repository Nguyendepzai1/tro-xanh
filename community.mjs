import {addressCatalog} from './addresses.mjs';
// Chỉ tài khoản có hợp đồng được đánh giá; báo cáo chỉ người gửi và quản trị viên xem được.
export function communityRoutes({db,guard,fail,text,integer,tx,audit,publicListing}) {
 const publicReviews=(column,id)=>db.prepare(`SELECT r.id,r.rating,r.body,r.created_at,l.title,u.name reviewer_name FROM reviews r JOIN users u ON u.id=r.user_id JOIN listings l ON l.id=r.listing_id JOIN users o ON o.id=r.owner_id WHERE r.${column}=? AND r.status='published' AND u.active=1 AND o.active=1 AND o.approved=1 ORDER BY r.id DESC LIMIT 100`).all(id);
 return function(req,url,ctx,b){const path=url.pathname,method=req.method;let m;
  if(path==='/api/address-catalog'&&method==='GET')return {effective_from:addressCatalog.effective_from,province_count:addressCatalog.provinces.length,ward_count:addressCatalog.provinces.reduce((n,p)=>n+p.wards.length,0),items:addressCatalog.provinces.map(({code,name})=>({code,name}))};
  m=path.match(/^\/api\/address-catalog\/(\d+)$/);
  if(m&&method==='GET'){const p=addressCatalog.provinces.find(p=>p.code===+m[1]);if(!p)fail(404,'Không có tỉnh/thành này trong danh mục.');return p;}
  if(path==='/api/compare'&&method==='GET'){
   const raw=url.searchParams.get('ids')||'';if(!/^\d+(,\d+){1,2}$/.test(raw))fail(400,'Chọn từ 2 đến 3 phòng để so sánh.');
   const ids=raw.split(',').map(v=>integer(v,'Mã phòng',1));if(new Set(ids).size!==ids.length)fail(400,'Danh sách phòng bị trùng.');
   const rows=db.prepare(`SELECT l.*,u.name owner_name FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id IN (${ids.map(()=>'?').join(',')}) AND l.status='published' AND l.occupancy='available' AND u.active=1 AND u.approved=1 AND NOT EXISTS(SELECT 1 FROM rental_deals d WHERE d.listing_id=l.id AND d.status IN ('accepted','funded'))`).all(...ids);
   return {items:ids.map(id=>rows.find(r=>r.id===id)).filter(Boolean).map(publicListing),unavailable_ids:ids.filter(id=>!rows.some(r=>r.id===id))};
  }
  m=path.match(/^\/api\/(owners|listings)\/(\d+)\/reviews$/);
  if(m&&method==='GET'){
   const id=+m[2],owner=m[1]==='owners';
   if(owner?!db.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND active=1 AND approved=1").get(id):!db.prepare("SELECT l.id FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=? AND l.status='published' AND u.active=1 AND u.approved=1").get(id))fail(404,'Không có hồ sơ hoặc tin công khai.');
   const items=publicReviews(owner?'owner_id':'listing_id',id);
   const summary=db.prepare(`SELECT count(*) count,round(avg(r.rating),1) average FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.${owner?'owner_id':'listing_id'}=? AND r.status='published' AND u.active=1`).get(id);
   return {items,...summary};
  }
  if(path==='/api/reviews'&&method==='GET'){
   const u=guard(ctx);if(u.role==='admin')return db.prepare('SELECT r.*,u.name reviewer_name,l.title FROM reviews r JOIN users u ON u.id=r.user_id JOIN listings l ON l.id=r.listing_id ORDER BY r.id DESC LIMIT 200').all();
   if(u.role!=='seeker')fail(403,'Mục này dành cho người thuê.');
   return {items:db.prepare('SELECT r.*,l.title FROM reviews r JOIN listings l ON l.id=r.listing_id WHERE r.user_id=? ORDER BY r.id DESC').all(u.id),eligible_leases:db.prepare(`SELECT c.id,l.title,c.start_date,c.status FROM leases c JOIN listings l ON l.id=c.listing_id WHERE c.tenant_user_id=? AND c.start_date<=date('now','+7 hours') AND NOT EXISTS(SELECT 1 FROM reviews r WHERE r.lease_id=c.id) ORDER BY c.id DESC`).all(u.id)};
  }
  if(path==='/api/reviews'&&method==='POST'){
   const u=guard(ctx,'seeker'),id=integer(b.lease_id,'Hợp đồng',1),rating=integer(b.rating,'Số sao',1,5),body=text(b.body,'Nội dung đánh giá',20,2000);
   return tx(()=>{const c=db.prepare("SELECT c.*,l.owner_id FROM leases c JOIN listings l ON l.id=c.listing_id WHERE c.id=? AND c.tenant_user_id=? AND c.start_date<=date('now','+7 hours')").get(id,u.id);if(!c)fail(404,'Chỉ được đánh giá hợp đồng của bạn đã đến ngày bắt đầu thuê.');if(db.prepare('SELECT id FROM reviews WHERE lease_id=?').get(id))fail(409,'Mỗi hợp đồng chỉ được gửi một đánh giá.');const r=db.prepare('INSERT INTO reviews(lease_id,user_id,listing_id,owner_id,rating,body) VALUES(?,?,?,?,?,?)').run(c.id,u.id,c.listing_id,c.owner_id,rating,body);audit(u,'submit_review',r.lastInsertRowid);return {message:'Đã gửi đánh giá chờ kiểm duyệt.'};});
  }
  m=path.match(/^\/api\/admin\/reviews\/(\d+)$/);
  if(m&&method==='PATCH'){
   const u=guard(ctx,'admin'),note=text(b.note,'Ghi chú kiểm duyệt',10,1000);if(!['published','rejected','hidden'].includes(b.status))fail(400,'Quyết định không hợp lệ.');
   const r=db.prepare('SELECT * FROM reviews WHERE id=?').get(+m[1]);if(!r)fail(404,'Không có đánh giá.');if(r.status===b.status)fail(409,'Đánh giá đã ở trạng thái này.');db.prepare('UPDATE reviews SET status=?,note=?,reviewed_by=? WHERE id=?').run(b.status,note,u.id,r.id);audit(u,'review_'+b.status,r.id);return {message:'Đã cập nhật kiểm duyệt đánh giá.'};
  }
  if(path==='/api/reports'&&method==='GET'){
   const u=guard(ctx);return db.prepare(`SELECT r.*,l.title FROM listing_reports r JOIN listings l ON l.id=r.listing_id ${u.role==='admin'?'':'WHERE r.user_id=?'} ORDER BY r.id DESC LIMIT 200`).all(...(u.role==='admin'?[]:[u.id]));
  }
  if(path==='/api/reports'&&method==='POST'){
   const u=guard(ctx);if(u.role==='admin')fail(403,'Quản trị viên xử lý trực tiếp trong mục kiểm duyệt.');
   const id=integer(b.listing_id,'Mã tin',1),l=db.prepare("SELECT l.*,u.active,u.approved FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=? AND l.status='published' AND u.active=1 AND u.approved=1").get(id);if(!l)fail(404,'Tin không còn công khai.');if(l.owner_id===u.id)fail(400,'Không báo cáo tin của chính bạn.');
   if(!['wrong_info','scam','unavailable','inappropriate'].includes(b.reason))fail(400,'Chọn lý do báo cáo.');const detail=text(b.detail,'Chi tiết báo cáo',20,2000);
   if(db.prepare("SELECT id FROM listing_reports WHERE listing_id=? AND user_id=? AND status='open'").get(id,u.id))fail(409,'Bạn đã có báo cáo đang chờ xử lý cho tin này.');
   if(db.prepare("SELECT count(*) n FROM listing_reports WHERE user_id=? AND created_at>datetime('now','-1 day')").get(u.id).n>=10)fail(429,'Tối đa 10 báo cáo mỗi ngày.');
   const r=db.prepare('INSERT INTO listing_reports(listing_id,user_id,reason,detail) VALUES(?,?,?,?)').run(id,u.id,b.reason,detail);audit(u,'report_listing',r.lastInsertRowid);return {message:'Đã gửi báo cáo riêng cho quản trị viên.'};
  }
  m=path.match(/^\/api\/admin\/reports\/(\d+)$/);
  if(m&&method==='PATCH'){
   const u=guard(ctx,'admin'),note=text(b.note,'Kết quả xử lý',10,1000);if(!['resolved','dismissed'].includes(b.status)||typeof b.hide_listing!=='boolean')fail(400,'Quyết định hoặc lựa chọn ẩn tin không hợp lệ.');if(b.status==='dismissed'&&b.hide_listing)fail(400,'Không vừa bỏ qua báo cáo vừa ẩn tin.');
   return tx(()=>{const r=db.prepare("SELECT * FROM listing_reports WHERE id=? AND status='open'").get(+m[1]);if(!r)fail(409,'Báo cáo không tồn tại hoặc đã xử lý.');db.prepare('UPDATE listing_reports SET status=?,note=?,reviewed_by=? WHERE id=?').run(b.status,note,u.id,r.id);if(b.hide_listing)db.prepare("UPDATE listings SET status='hidden',review_note=? WHERE id=?").run(note,r.listing_id);audit(u,'resolve_report_'+b.status,r.id);return {message:'Đã lưu kết quả xử lý báo cáo.'};});
  }
  return undefined;
 };
}
