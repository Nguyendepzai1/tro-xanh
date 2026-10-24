import {randomBytes} from 'node:crypto';

// All money is integer VND. These routes record simulations, never move real funds.
export function upgradeRoutes({db,guard,owner,fail,text,integer,tx,audit,publicListing}) {
 const verified=id=>!!db.prepare("SELECT id FROM owner_verifications WHERE user_id=? AND status='approved'").get(id);
 function conversation(ctx,id){const u=guard(ctx),c=db.prepare('SELECT * FROM conversations WHERE id=? AND (seeker_id=? OR owner_id=?)').get(id,u.id,u.id);if(!c)fail(404,'Không tìm thấy cuộc trò chuyện của bạn.');return c;}
 function liveParticipants(c){const n=db.prepare('SELECT count(*) n FROM users WHERE id IN (?,?) AND active=1').get(c.seeker_id,c.owner_id).n;if(n!==2)fail(409,'Một tài khoản đã bị khóa. Cuộc trò chuyện hiện chỉ để đọc.');}
 const fee=()=>db.prepare("SELECT value FROM platform_settings WHERE key='success_fee_bps'").get().value;
 function deal(ctx,id){const u=guard(ctx),d=db.prepare('SELECT * FROM rental_deals WHERE id=? AND (seeker_id=? OR owner_id=?)').get(id,u.id,u.id);if(!d)fail(404,'Không tìm thấy đề nghị thuê của bạn.');return d;}
 const paymentView=u=>db.prepare(`SELECT p.*,l.title, d.terms FROM payments p LEFT JOIN rental_deals d ON d.id=p.deal_id LEFT JOIN invoices i ON i.id=p.invoice_id LEFT JOIN leases c ON c.id=i.lease_id LEFT JOIN listings l ON l.id=COALESCE(d.listing_id,c.listing_id) ${u.role==='admin'?'':'WHERE p.payer_id=? OR p.owner_id=?'} ORDER BY p.id DESC LIMIT 200`).all(...(u.role==='admin'?[]:[u.id,u.id]));
 return async function(req,res,url,ctx,b){const method=req.method,path=url.pathname;let m;
 // Expiry only releases unpaid offers; funded deposits require explicit reconciliation.
 tx(()=>{db.prepare("UPDATE payments SET status='cancelled' WHERE status='pending' AND deal_id IN (SELECT id FROM rental_deals WHERE status IN ('offered','accepted') AND expires_at<=CURRENT_TIMESTAMP)").run();db.prepare("UPDATE rental_deals SET status='cancelled' WHERE status IN ('offered','accepted') AND expires_at<=CURRENT_TIMESTAMP").run();});
 if(path==='/api/locations'&&method==='GET')return db.prepare("SELECT l.city,l.district,count(*) count FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.status='published' AND l.occupancy='available' AND u.active=1 AND u.approved=1 AND NOT EXISTS (SELECT 1 FROM rental_deals d WHERE d.listing_id=l.id AND d.status IN ('accepted','funded')) GROUP BY l.city,l.district ORDER BY l.city,l.district").all();
 if(path==='/api/platform-policy'&&method==='GET')return {fee_bps:fee(),basis:'first_month_rent',payer:'owner',frequency:'once_per_successful_lease',payment_mode:'simulation'};
 if(path==='/api/owner/profile'&&['GET','PUT'].includes(method)){
  const u=guard(ctx,'owner');
  if(method==='PUT'){db.prepare('INSERT INTO owner_profiles(user_id,bio,area) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET bio=excluded.bio,area=excluded.area,updated_at=CURRENT_TIMESTAMP').run(u.id,text(b.bio,'Giới thiệu',10,2000),text(b.area,'Khu vực hoạt động',2,160));audit(u,'update_owner_profile',u.id);}
  return db.prepare('SELECT * FROM owner_profiles WHERE user_id=?').get(u.id)||{bio:'',area:''};
 }
 m=path.match(/^\/api\/owners\/(\d+)$/);
 if(m&&method==='GET'){
  const u=db.prepare("SELECT id,name,phone,created_at FROM users WHERE id=? AND role='owner' AND active=1 AND approved=1").get(+m[1]);if(!u)fail(404,'Chủ trọ chưa có hồ sơ công khai.');
  return {...u,...db.prepare('SELECT bio,area FROM owner_profiles WHERE user_id=?').get(u.id),documents_reviewed:verified(u.id),listings:db.prepare("SELECT * FROM listings WHERE owner_id=? AND status='published' AND occupancy='available' AND NOT EXISTS (SELECT 1 FROM rental_deals d WHERE d.listing_id=listings.id AND d.status IN ('accepted','funded')) ORDER BY id DESC").all(u.id).map(publicListing)};
 }
 if(path==='/api/verification-files'&&method==='POST'){
  const u=guard(ctx,'owner');if(typeof b.data!=='string'||b.data.length>2900000)fail(400,'Minh chứng chỉ nhận ảnh JPEG hoặc PNG tối đa 2 MB.');
  const x=b.data.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/);if(!x)fail(400,'Chỉ nhận ảnh JPEG hoặc PNG.');const bytes=Buffer.from(x[2],'base64');const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=bytes.subarray(0,3).equals(Buffer.from([255,216,255]));
  if(bytes.length<16||bytes.length>2*1024*1024||!(x[1]==='png'?png:jpg))fail(400,'Nội dung ảnh minh chứng không hợp lệ.');
  if(db.prepare('SELECT count(*) n FROM verification_files WHERE user_id=?').get(u.id).n>=20)fail(409,'Đã có 20 tệp minh chứng. Liên hệ quản trị viên để xử lý.');
  const id=randomBytes(16).toString('hex');db.prepare('INSERT INTO verification_files(id,user_id,mime,content) VALUES(?,?,?,?)').run(id,u.id,'image/'+x[1],bytes);audit(u,'upload_private_evidence',id);return {id};
 }
 m=path.match(/^\/api\/verification-files\/([a-f0-9]{32})$/);
 if(m&&method==='GET'){const u=guard(ctx),f=db.prepare('SELECT * FROM verification_files WHERE id=?').get(m[1]);if(!f||(u.role!=='admin'&&f.user_id!==u.id))fail(404,'Không tìm thấy minh chứng.');return {data:`data:${f.mime};base64,${Buffer.from(f.content).toString('base64')}`};}
 if(path==='/api/verifications'&&method==='GET'){const u=guard(ctx);if(!['admin','owner'].includes(u.role))fail(403,'Không có quyền xem hồ sơ.');return db.prepare(`SELECT v.*,u.name,u.phone FROM owner_verifications v JOIN users u ON u.id=v.user_id ${u.role==='admin'?'':'WHERE v.user_id=?'} ORDER BY v.id DESC`).all(...(u.role==='admin'?[]:[u.id]));}
 if(path==='/api/verifications'&&method==='POST'){
  const u=guard(ctx,'owner');if(verified(u.id))fail(409,'Hồ sơ đã được xét duyệt. Liên hệ quản trị viên nếu cần thay đổi.');
  if(!['owner','authorized'].includes(b.relationship))fail(400,'Chọn quyền sở hữu hoặc được ủy quyền.');
  if(!db.prepare('SELECT id FROM verification_files WHERE id=? AND user_id=?').get(typeof b.evidence_id==='string'?b.evidence_id:'',u.id))fail(400,'Cần tải lên minh chứng riêng của bạn.');
  const values=[u.id,text(b.legal_name,'Họ tên trên minh chứng',2,100),text(b.address,'Địa chỉ cho thuê',10,300),b.relationship,b.evidence_id,text(b.explanation,'Mô tả minh chứng',20,2000)];
  return tx(()=>{if(db.prepare("SELECT id FROM owner_verifications WHERE user_id=? AND status='pending'").get(u.id))fail(409,'Đang có hồ sơ chờ duyệt.');const r=db.prepare('INSERT INTO owner_verifications(user_id,legal_name,address,relationship,evidence_id,explanation) VALUES(?,?,?,?,?,?)').run(...values);if(!u.approved&&!db.prepare("SELECT id FROM owner_requests WHERE user_id=? AND status='pending'").get(u.id))db.prepare('INSERT INTO owner_requests(user_id,message) VALUES(?,?)').run(u.id,values[5]);audit(u,'submit_verification',r.lastInsertRowid);return {message:'Đã gửi hồ sơ minh chứng để quản trị viên đối chiếu.'};});
 }
 m=path.match(/^\/api\/admin\/verifications\/(\d+)$/);
 if(m&&method==='PATCH'){
  const u=guard(ctx,'admin');if(!['approved','rejected'].includes(b.status))fail(400,'Quyết định không hợp lệ.');const note=text(b.note,'Kết quả đối chiếu và liên hệ',10,1000);
  if(b.status==='approved'&&b.checked!==true)fail(400,'Cần xác nhận đã đối chiếu minh chứng, địa chỉ và liên hệ chủ trọ.');
  return tx(()=>{const v=db.prepare("SELECT v.* FROM owner_verifications v JOIN users u ON u.id=v.user_id WHERE v.id=? AND v.status='pending' AND u.active=1").get(+m[1]);if(!v)fail(409,'Hồ sơ đã xử lý hoặc tài khoản bị khóa.');db.prepare('UPDATE owner_verifications SET status=?,note=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?').run(b.status,note,u.id,v.id);if(b.status==='approved')db.prepare('UPDATE users SET approved=1 WHERE id=?').run(v.user_id);db.prepare("UPDATE owner_requests SET status=?,note=?,reviewed_by=? WHERE user_id=? AND status='pending'").run(b.status,note,u.id,v.user_id);audit(u,'verification_'+b.status,v.id);return {message:'Đã lưu quyết định đối chiếu hồ sơ.'};});
 }
 if(path==='/api/conversations'&&method==='POST'){
  const u=guard(ctx,'seeker'),id=integer(b.listing_id,'Phòng',1),l=db.prepare("SELECT l.* FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=? AND l.status='published' AND l.occupancy='available' AND u.active=1 AND u.approved=1").get(id);if(!l)fail(404,'Phòng không còn nhận cuộc trò chuyện mới.');
  db.prepare('INSERT OR IGNORE INTO conversations(listing_id,seeker_id,owner_id) VALUES(?,?,?)').run(id,u.id,l.owner_id);return db.prepare('SELECT id FROM conversations WHERE listing_id=? AND seeker_id=?').get(id,u.id);
 }
 if(path==='/api/conversations'&&method==='GET'){
  const u=guard(ctx);if(!['seeker','owner'].includes(u.role))fail(403,'Hộp thư dành cho khách thuê và chủ trọ.');
  return db.prepare(`SELECT c.*,l.title,s.name seeker_name,o.name owner_name,
   (SELECT body FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) last_message,
   (SELECT count(*) FROM messages WHERE conversation_id=c.id AND sender_id<>? AND id>CASE WHEN c.seeker_id=? THEN c.seeker_read ELSE c.owner_read END) unread
   FROM conversations c JOIN listings l ON l.id=c.listing_id JOIN users s ON s.id=c.seeker_id JOIN users o ON o.id=c.owner_id WHERE c.seeker_id=? OR c.owner_id=? ORDER BY COALESCE((SELECT max(id) FROM messages WHERE conversation_id=c.id),0) DESC,c.id DESC`).all(u.id,u.id,u.id,u.id);
 }
 m=path.match(/^\/api\/conversations\/(\d+)\/messages$/);
 if(m&&method==='GET'){
  const c=conversation(ctx,+m[1]),after=integer(url.searchParams.get('after')||0,'Mốc tin nhắn',0,Number.MAX_SAFE_INTEGER);
  const items=db.prepare('SELECT id,sender_id,body,created_at FROM messages WHERE conversation_id=? AND id>? ORDER BY id LIMIT 100').all(c.id,after);
  return {items,has_more:items.length===100};
 }
 if(m&&method==='POST'){
  const c=conversation(ctx,+m[1]);liveParticipants(c);const body=text(b.body,'Tin nhắn',1,2000),key=text(b.client_key,'Mã gửi',8,80);const old=db.prepare('SELECT id,body FROM messages WHERE conversation_id=? AND sender_id=? AND client_key=?').get(c.id,ctx.user.id,key);if(old){if(old.body!==body)fail(409,'Mã gửi đã dùng cho nội dung khác.');return {id:old.id};}
  if(db.prepare("SELECT count(*) n FROM messages WHERE sender_id=? AND created_at>datetime('now','-1 minute')").get(ctx.user.id).n>=30)fail(429,'Bạn gửi quá nhanh. Vui lòng đợi một phút.');
  const r=db.prepare('INSERT INTO messages(conversation_id,sender_id,body,client_key) VALUES(?,?,?,?)').run(c.id,ctx.user.id,body,key);return {id:Number(r.lastInsertRowid)};
 }
 m=path.match(/^\/api\/conversations\/(\d+)\/read$/);
 if(m&&method==='POST'){const c=conversation(ctx,+m[1]),id=integer(b.message_id,'Tin đã đọc',0,Number.MAX_SAFE_INTEGER);if(id&&!db.prepare('SELECT id FROM messages WHERE id=? AND conversation_id=?').get(id,c.id))fail(400,'Tin nhắn không thuộc hội thoại.');const col=ctx.user.id===c.seeker_id?'seeker_read':'owner_read';db.prepare(`UPDATE conversations SET ${col}=MAX(${col},?) WHERE id=?`).run(id,c.id);return {message:'Đã đọc.'};}
 if(path==='/api/deals'&&method==='GET'){const u=guard(ctx);return db.prepare(`SELECT d.*,l.title,s.name seeker_name,o.name owner_name FROM rental_deals d JOIN listings l ON l.id=d.listing_id JOIN users s ON s.id=d.seeker_id JOIN users o ON o.id=d.owner_id ${u.role==='admin'?'':'WHERE d.seeker_id=? OR d.owner_id=?'} ORDER BY d.id DESC`).all(...(u.role==='admin'?[]:[u.id,u.id]));}
 if(path==='/api/deals'&&method==='POST'){
  const u=owner(ctx),c=conversation(ctx,integer(b.conversation_id,'Cuộc trò chuyện',1));liveParticipants(c);if(c.owner_id!==u.id)fail(403,'Không có quyền đề nghị thuê.');if(!verified(u.id))fail(409,'Cần hồ sơ minh chứng đã được duyệt trước khi nhận đặt cọc.');
  const l=db.prepare("SELECT * FROM listings WHERE id=? AND status='published' AND occupancy='available'").get(c.listing_id);if(!l)fail(409,'Phòng không còn trống và công khai.');
  if(l.deposit<=0)fail(400,'Phòng không yêu cầu cọc. Có thể tạo hợp đồng trực tiếp.');
  if(b.accept_fee!==true)fail(400,'Chủ trọ cần đồng ý phí thành công được hiển thị.');
  if(db.prepare("SELECT id FROM rental_deals WHERE conversation_id=? AND status IN ('offered','accepted','funded')").get(c.id))fail(409,'Đã có đề nghị đang xử lý.');
  const r=db.prepare('INSERT INTO rental_deals(conversation_id,listing_id,seeker_id,owner_id,rent,deposit,terms,fee_bps) VALUES(?,?,?,?,?,?,?,?)').run(c.id,l.id,c.seeker_id,u.id,l.price,l.deposit,text(b.terms,'Điều kiện cọc và hoàn cọc',30,3000),fee());audit(u,'offer_rental',r.lastInsertRowid);return {id:Number(r.lastInsertRowid),message:'Đã gửi đề nghị với giá và phí được chốt tại thời điểm này.'};
 }
 m=path.match(/^\/api\/deals\/(\d+)\/(accept|cancel|complete)$/);
 if(m&&method==='POST')return tx(()=>{
  const d=deal(ctx,+m[1]),action=m[2];liveParticipants(d);
  if(action==='accept'){
   if(ctx.user.id!==d.seeker_id)fail(403,'Chỉ khách thuê được đồng ý.');if(d.status!=='offered')fail(409,'Đề nghị đã được xử lý.');
   const l=db.prepare('SELECT l.*,u.active,u.approved FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.id=?').get(d.listing_id);if(l.occupancy!=='available'||l.status!=='published'||!l.active||!l.approved)fail(409,'Phòng không còn nhận cọc.');
   if(db.prepare("SELECT id FROM rental_deals WHERE listing_id=? AND status IN ('accepted','funded')").get(d.listing_id))fail(409,'Phòng đang được khách khác làm thủ tục.');
   if(b.agree!==true)fail(400,'Cần đồng ý điều kiện cọc trước khi tiếp tục.');db.prepare("UPDATE rental_deals SET status='accepted' WHERE id=?").run(d.id);
  }else if(action==='cancel'){
   if(!['offered','accepted'].includes(d.status))fail(409,'Đã ghi nhận tiền cọc: cần quản trị viên xử lý hoàn cọc.');db.prepare("UPDATE payments SET status='cancelled' WHERE deal_id=? AND status='pending'").run(d.id);db.prepare("UPDATE rental_deals SET status='cancelled' WHERE id=?").run(d.id);
  }else{
   if(ctx.user.id!==d.seeker_id)fail(403,'Chỉ khách thuê xác nhận nhận phòng.');if(d.status!=='funded')fail(409,'Cần ghi nhận cọc trước khi hoàn tất.');if(b.agree!==true)fail(400,'Cần xác nhận đã ký hợp đồng và nhận phòng.');
   const c=db.prepare("SELECT * FROM leases WHERE listing_id=? AND tenant_user_id=? AND status='active' AND rent=? AND deposit=?").get(d.listing_id,d.seeker_id,d.rent,d.deposit);if(!c)fail(409,'Chủ trọ cần tạo hợp đồng đúng tài khoản, giá thuê và tiền cọc đã thỏa thuận.');
   db.prepare("UPDATE rental_deals SET status='completed',lease_id=? WHERE id=?").run(c.id,d.id);db.prepare('INSERT INTO commissions(deal_id,lease_id,owner_id,base_rent,fee_bps,amount) VALUES(?,?,?,?,?,?)').run(d.id,c.id,d.owner_id,d.rent,d.fee_bps,Math.round(d.rent*d.fee_bps/10000));
  }audit(ctx.user,'deal_'+action,d.id);return {message:'Đã cập nhật đề nghị thuê.'};
 });
 if(path==='/api/payments'&&method==='GET'){const u=guard(ctx);return {mode:'simulation',items:paymentView(u)};}
 if(path==='/api/payments'&&method==='POST')return tx(()=>{
  const u=guard(ctx,'seeker');let d,i,amount,ownerId;
  if(b.kind==='deposit'){d=deal(ctx,integer(b.deal_id,'Đề nghị',1));if(d.seeker_id!==u.id||d.status!=='accepted')fail(409,'Đề nghị cần được bạn đồng ý trước.');liveParticipants(d);amount=d.deposit;ownerId=d.owner_id;}
  else if(b.kind==='rent'){i=db.prepare("SELECT i.*,l.owner_id,u.active owner_active,c.status lease_status FROM invoices i JOIN leases c ON c.id=i.lease_id JOIN listings l ON l.id=c.listing_id JOIN users u ON u.id=l.owner_id WHERE i.id=? AND c.tenant_user_id=?").get(integer(b.invoice_id,'Hóa đơn',1),u.id);if(!i||!i.owner_active)fail(404,'Không có hóa đơn của bạn.');if(i.status!=='unpaid'||i.lease_status!=='active')fail(409,'Hóa đơn đã thu hoặc hợp đồng đã kết thúc.');amount=i.total;ownerId=i.owner_id;}
  else fail(400,'Loại thanh toán không hợp lệ.');if(amount<=0)fail(400,'Hóa đơn không có số tiền cần thu.');
  const old=db.prepare(`SELECT * FROM payments WHERE ${d?'deal_id':'invoice_id'}=? AND status IN ('pending','paid')`).get(d?.id??i.id);if(old)return old;
  const reference='TX-'+randomBytes(10).toString('hex').toUpperCase(),r=db.prepare('INSERT INTO payments(payer_id,owner_id,deal_id,invoice_id,kind,amount,reference) VALUES(?,?,?,?,?,?,?)').run(u.id,ownerId,d?.id??null,i?.id??null,b.kind,amount,reference);audit(u,'create_simulated_payment',r.lastInsertRowid);return db.prepare('SELECT * FROM payments WHERE id=?').get(r.lastInsertRowid);
 });
 if(path==='/api/commissions'&&method==='GET'){const u=guard(ctx);if(!['admin','owner'].includes(u.role))fail(403,'Phí này dành cho chủ trọ.');return db.prepare(`SELECT c.*,u.name owner_name,l.title FROM commissions c JOIN users u ON u.id=c.owner_id JOIN leases a ON a.id=c.lease_id JOIN listings l ON l.id=a.listing_id ${u.role==='owner'?'WHERE c.owner_id=?':''} ORDER BY c.id DESC`).all(...(u.role==='owner'?[u.id]:[]));}
 m=path.match(/^\/api\/payments\/(\d+)\/cancel$/);
 if(m&&method==='POST'){const u=guard(ctx,'seeker'),p=db.prepare("UPDATE payments SET status='cancelled' WHERE id=? AND payer_id=? AND status='pending'").run(+m[1],u.id);if(!p.changes)fail(409,'Giao dịch không còn chờ xử lý hoặc không thuộc bạn.');audit(u,'cancel_simulated_payment',m[1]);return {message:'Đã hủy giao dịch chờ xử lý.'};}
 m=path.match(/^\/api\/admin\/payments\/(\d+)\/(confirm|refund)$/);
 if(m&&method==='POST')return tx(()=>{
  const u=guard(ctx,'admin'),p=db.prepare('SELECT * FROM payments WHERE id=?').get(+m[1]);if(!p)fail(404,'Không tìm thấy giao dịch.');const note=text(b.note,'Ghi chú mô phỏng đối soát',10,1000);
  if(m[2]==='confirm'){
   if(p.status!=='pending')fail(409,'Giao dịch đã được xử lý.');
   if(p.kind==='deposit'){const d=db.prepare("SELECT d.*,l.occupancy,l.status listing_status FROM rental_deals d JOIN listings l ON l.id=d.listing_id WHERE d.id=? AND d.status='accepted'").get(p.deal_id);if(!d||d.occupancy!=='available'||d.listing_status!=='published')fail(409,'Đề nghị không còn nhận cọc.');liveParticipants(d);if(p.amount!==d.deposit)fail(409,'Số tiền không khớp.');db.prepare("UPDATE rental_deals SET status='funded' WHERE id=?").run(d.id);}
   else{const i=db.prepare("SELECT i.*,c.tenant_user_id,c.status lease_status,u.active owner_active FROM invoices i JOIN leases c ON c.id=i.lease_id JOIN listings l ON l.id=c.listing_id JOIN users u ON u.id=l.owner_id WHERE i.id=?").get(p.invoice_id);if(i.status!=='unpaid'||i.total!==p.amount||i.tenant_user_id!==p.payer_id||i.lease_status!=='active'||!i.owner_active||!db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(p.payer_id))fail(409,'Hóa đơn hoặc tài khoản không còn phù hợp.');db.prepare("UPDATE invoices SET status='paid',paid_at=CURRENT_TIMESTAMP WHERE id=?").run(i.id);}
   db.prepare("UPDATE payments SET status='paid',paid_at=CURRENT_TIMESTAMP,note=? WHERE id=?").run(note,p.id);
  }else{
   if(p.status!=='paid')fail(409,'Chỉ hoàn giao dịch đã ghi nhận.');
   if(p.kind==='deposit'){const d=db.prepare('SELECT * FROM rental_deals WHERE id=?').get(p.deal_id);if(d.status!=='funded'||db.prepare("SELECT id FROM leases WHERE listing_id=? AND status='active'").get(d.listing_id))fail(409,'Đã có hợp đồng hoặc đã nhận phòng: xử lý hoàn cọc theo hợp đồng ngoài luồng thử nghiệm.');db.prepare("UPDATE rental_deals SET status='refunded' WHERE id=?").run(d.id);}
   else db.prepare("UPDATE invoices SET status='unpaid',paid_at=NULL WHERE id=?").run(p.invoice_id);
   db.prepare("UPDATE payments SET status='refunded',note=? WHERE id=?").run(note,p.id);
  }audit(u,'simulation_payment_'+m[2],p.id);return {message:'Đã cập nhật mô phỏng, không có tiền thật được chuyển.'};
 });
 m=path.match(/^\/api\/admin\/commissions\/(\d+)\/paid$/);
 if(m&&method==='POST'){const u=guard(ctx,'admin'),note=text(b.note,'Ghi chú ghi thu phí',10,1000),r=db.prepare("UPDATE commissions SET status='paid' WHERE id=? AND status='due'").run(+m[1]);if(!r.changes)fail(409,'Phí đã xử lý hoặc không tồn tại.');audit(u,'simulation_commission_paid',m[1]+': '+note);return {message:'Đã ghi thu phí trong sổ thử nghiệm.'};}
 if(path==='/api/admin/policy'&&method==='PATCH'){const u=guard(ctx,'admin'),bps=integer(b.fee_bps,'Tỷ lệ phí',0,2000);db.prepare("UPDATE platform_settings SET value=? WHERE key='success_fee_bps'").run(bps);audit(u,'set_success_fee_bps',bps);return {message:'Phí mới chỉ áp dụng cho các đề nghị tạo sau thời điểm này.'};}
 return undefined;
 };
}
