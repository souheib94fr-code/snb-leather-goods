// SNB Premium Admin Layer v1
const AD={coupons:[],shipping:[],inventory:[],notifications:[],currentTab:'dashboard',orderChannel:null};

async function openAdminLogin(){
  const {data:userData}=await sb.auth.getUser();
  const u=userData?.user;
  if(!u)return showModal(`<div class="modal-head"><h3>SNB Admin</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div class="notice">${lang==='ar'?'سجّل الدخول بحساب الإدارة أولاً.':'Sign in with the admin account first.'}</div><button class="btn gold" style="width:100%" onclick="closeOverlay();openAuth()">${t('login')}</button>`);
  if(!currentUser||currentUser.id!==u.id)await setSignedInCustomer(u,false);
  if(!await checkAdmin())return showModal(`<div class="modal-head"><h3>SNB Admin</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div class="notice" style="border-color:rgba(209,96,96,.4)">${lang==='ar'?'الحساب المفتوح حالياً ليس حساب إدارة.':'The account currently signed in is not an admin account.'}<br><b>${escapeHtml(u.email||'')}</b></div><button class="btn gold" style="width:100%" onclick="logoutCustomer().then(()=>openAuth())">${lang==='ar'?'تبديل الحساب':'Switch account'}</button>`);
  closeOverlay();await loadAdminData();renderAdmin('dashboard');
}
async function loadAdminData(){
  const [pd,od,cu,co,sr,im,no]=await Promise.all([
    sb.from('products').select('*,product_variants(*),product_images(*)').order('created_at',{ascending:false}),
    sb.from('orders').select('*,order_items(*),order_status_history(*)').order('created_at',{ascending:false}),
    sb.from('customers').select('*').order('created_at',{ascending:false}),
    sb.from('coupons').select('*').order('created_at',{ascending:false}),
    sb.from('shipping_rules').select('*').order('emirate'),
    sb.from('inventory_movements').select('*').order('created_at',{ascending:false}).limit(250),
    sb.from('notification_outbox').select('*').order('created_at',{ascending:false}).limit(100)
  ]);
  for(const q of [pd,od,cu])if(q.error)throw q.error;
  products=(pd.data||[]).map(normalizeProduct);
  orders=(od.data||[]).map(o=>({...o,customer:o.customer_name,date:new Date(o.created_at).toLocaleString(),items:o.order_items||[],history:o.order_status_history||[]}));
  customers=(cu.data||[]).map(c=>({...c,created:new Date(c.created_at).toLocaleString()}));
  AD.coupons=co.error?[]:(co.data||[]);
  AD.shipping=sr.error?[]:(sr.data||[]);
  AD.inventory=im.error?[]:(im.data||[]);
  AD.notifications=no.error?[]:(no.data||[]);
}
function adTodayKey(d){const x=new Date(d);return [x.getFullYear(),x.getMonth(),x.getDate()].join('-')}
function adLowStockRows(){
  const out=[];
  for(const p of products)for(const v of p.variants||[])if(v.stock<=Number(p.low_stock_threshold??2))out.push({p,v});
  return out.sort((a,b)=>a.v.stock-b.v.stock);
}
function renderAdmin(tab='dashboard'){
  AD.currentTab=tab;
  document.getElementById('adminApp')?.remove();
  document.getElementById('customerApp').classList.add('hidden');document.getElementById('bottomnav').classList.add('hidden');
  const newCount=orders.filter(o=>o.status==='received').length;
  document.body.insertAdjacentHTML('beforeend',`<div id="adminApp" class="admin"><header class="topbar" style="position:sticky"><div class="logo"><img src="assets/SNB-App-Icon.png"><div class="logo-text"><b>SNB ADMIN</b><small>LEATHER GOODS</small></div></div><div class="spacer"></div><button class="btn" onclick="exitAdmin()">← ${t('shop')}</button></header><div class="admin-shell"><aside class="sidebar">
    <button class="btn ${tab==='dashboard'?'gold':''}" onclick="renderAdminReplace('dashboard')">▦ ${t('dashboard')}</button>
    <button class="btn ${tab==='products'?'gold':''}" onclick="renderAdminReplace('products')">◇ ${t('products')}</button>
    <button class="btn ${tab==='orders'?'gold':''}" onclick="renderAdminReplace('orders')">🧾 ${t('orders')} ${newCount?`<span class="badge" style="background:#b52626;color:#fff">${newCount}</span>`:''}</button>
    <button class="btn ${tab==='coupons'?'gold':''}" onclick="renderAdminReplace('coupons')">％ ${lang==='ar'?'الكوبونات':'Coupons'}</button>
    <button class="btn ${tab==='shipping'?'gold':''}" onclick="renderAdminReplace('shipping')">🚚 ${lang==='ar'?'الشحن':'Shipping'}</button>
    <button class="btn ${tab==='inventory'?'gold':''}" onclick="renderAdminReplace('inventory')">▤ ${lang==='ar'?'المخزون':'Inventory'}</button>
    <button class="btn ${tab==='customers'?'gold':''}" onclick="renderAdminReplace('customers')">👥 ${t('customers')}</button>
    <button class="btn ${tab==='notifications'?'gold':''}" onclick="renderAdminReplace('notifications')">✉ ${lang==='ar'?'الإشعارات':'Notifications'}</button>
  </aside><main class="admin-main" id="adminMain"></main></div></div>`);
  const revenue=orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+Number(o.total||0),0);
  renderAdminTab(tab,revenue);
  adSubscribeNewOrders();
}
function renderAdminReplace(tab){document.getElementById('adminApp')?.remove();renderAdmin(tab)}
function renderAdminTab(tab,revenue){
  const el=document.getElementById('adminMain');if(!el)return;
  if(tab==='dashboard'){
    const today=adTodayKey(new Date());
    const todayOrders=orders.filter(o=>adTodayKey(o.created_at)===today&&o.status!=='cancelled');
    const todaySales=todayOrders.reduce((s,o)=>s+Number(o.total||0),0);
    const newOrders=orders.filter(o=>o.status==='received');
    const low=adLowStockRows();
    el.innerHTML=`<div class="section-head"><div><h3>${t('dashboard')}</h3><span>Supabase Cloud · Live</span></div></div>
      <div class="stats"><div class="stat"><b>${newOrders.length}</b><small>${lang==='ar'?'طلبات جديدة':'New orders'}</small></div><div class="stat"><b>${money(todaySales)}</b><small>${lang==='ar'?'مبيعات اليوم':'Today sales'}</small></div><div class="stat"><b>${low.length}</b><small>${lang==='ar'?'خيارات مخزون منخفض':'Low-stock options'}</small></div><div class="stat"><b>${money(revenue)}</b><small>${lang==='ar'?'إجمالي قيمة الطلبات':'Order value'}</small></div></div>
      ${newOrders.length?`<div class="notice" style="margin-top:14px;border-color:rgba(215,168,78,.55)"><b>🔔 ${lang==='ar'?'طلبات تحتاج انتباهك':'Orders need attention'}</b><div style="margin-top:8px">${newOrders.slice(0,5).map(o=>`<button class="btn small" style="margin:3px" onclick="renderAdminReplace('orders')">${escapeHtml(o.order_no)} · ${money(o.total)}</button>`).join('')}</div></div>`:''}
      <button class="btn" style="margin-top:12px" onclick="adEnableBrowserNotifications()">🔔 ${lang==='ar'?'فعّل تنبيه الطلبات الجديدة':'Enable new-order alerts'}</button>
      ${low.length?`<div class="tablewrap"><table class="table"><thead><tr><th>${lang==='ar'?'مخزون منخفض':'Low stock'}</th><th>${t('size')}</th><th>${t('color')}</th><th>${t('stock')}</th></tr></thead><tbody>${low.slice(0,12).map(x=>`<tr><td><b>${escapeHtml(x.p.name)}</b></td><td>${escapeHtml(x.v.size)}</td><td>${escapeHtml(x.v.color_name||x.v.color)}</td><td><span class="status warn">${x.v.stock}</span></td></tr>`).join('')}</tbody></table></div>`:''}`;
    return;
  }
  if(tab==='products'){
    el.innerHTML=`<div class="section-head"><div><h3>${t('products')}</h3><span>${products.length}</span></div><div class="spacer"></div><button class="btn gold" onclick="editProduct()">＋ ${t('addProduct')}</button></div><div class="tablewrap"><table class="table"><thead><tr><th>${t('productName')}</th><th>${t('category')}</th><th>${t('price')}</th><th>${t('stock')}</th><th>${lang==='ar'?'وسوم':'Badges'}</th><th>${t('status')}</th><th></th></tr></thead><tbody>${products.map(p=>`<tr><td><b>${escapeHtml(p.name)}</b><br><small class="muted">${(p.product_images||[]).length} ${lang==='ar'?'صور إضافية':'gallery images'}</small></td><td>${t(p.category)}</td><td>${money(p.price)}${p.discount?`<br><small>−${p.discount}%</small>`:''}</td><td>${p.stock}</td><td>${p.is_new?'<span class="status ok">NEW</span> ':''}${p.is_best_seller?'<span class="status ok">BEST</span> ':''}${p.stock<=p.low_stock_threshold?'<span class="status warn">LOW</span>':''}</td><td><span class="status ${p.active?'ok':'warn'}">${p.active?t('active'):t('inactive')}</span></td><td><button class="btn small" onclick="editProduct('${p.id}')">${t('edit')}</button> <button class="btn small danger" onclick="deleteProduct('${p.id}')">${t('delete')}</button></td></tr>`).join('')}</tbody></table></div>`;
    return;
  }
  if(tab==='orders'){
    const sts=['received','confirmed','preparing','shipped','out_for_delivery','delivered','cancelled'];
    el.innerHTML=`<div class="section-head"><div><h3>${t('orders')}</h3><span>${orders.length}</span></div></div><div class="tablewrap"><table class="table" style="min-width:1540px"><thead><tr><th>${t('orderNo')}</th><th>${t('customer')}</th><th>${t('items')}</th><th>${t('total')}</th><th>${t('status')}</th><th>${lang==='ar'?'التتبع':'Tracking'}</th><th>${lang==='ar'?'الفاتورة':'Invoice'}</th><th>${t('date')}</th></tr></thead><tbody>${orders.length?orders.map(o=>`<tr style="${o.status==='received'?'background:rgba(215,168,78,.045)':''}"><td><b>${escapeHtml(o.order_no)}</b>${o.status==='received'?'<br><span class="badge">NEW</span>':''}</td><td>${escapeHtml(o.customer||'—')}<br><small class="muted">${escapeHtml(o.mobile||o.email||'')}</small><br><small class="muted">${escapeHtml([o.emirate,o.city].filter(Boolean).join(' · '))}</small></td><td>${(o.items||[]).reduce((s,i)=>s+Number(i.qty||0),0)}</td><td>${money(o.total)}<br><small class="muted">${lang==='ar'?'شحن':'Ship'}: ${money(o.shipping_fee||0)}</small></td><td><select onchange="updateOrderStatus('${o.id}',this.value)">${sts.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${escapeHtml(statusLabel(s))}</option>`).join('')}</select></td><td><input id="carrier-${o.id}" placeholder="${lang==='ar'?'شركة الشحن':'Carrier'}" value="${escapeHtml(o.tracking_carrier||'')}" style="width:125px;margin-bottom:4px"><br><input id="tracking-${o.id}" placeholder="${lang==='ar'?'رقم التتبع':'Tracking no.'}" value="${escapeHtml(o.tracking_number||'')}" style="width:150px;margin-bottom:4px"><br><input id="trackingurl-${o.id}" placeholder="https://..." value="${escapeHtml(o.tracking_url||'')}" style="width:190px"><button class="btn small" style="margin-inline-start:4px" onclick="updateOrderTracking('${o.id}')">✓</button></td><td>${o.invoice_no&&o.status!=='cancelled'?`<b style="color:#f2cf7b">${escapeHtml(o.invoice_no)}</b><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px"><button class="btn small" onclick="snbOpenInvoice('${o.id}')">View</button><button class="btn small" onclick="snbDownloadInvoicePdf('${o.id}')">PDF</button><button class="btn small" onclick="snbEmailInvoice('${o.id}')">✉</button></div>`:`<small class="muted">${lang==='ar'?'بعد التأكيد':'After confirmation'}</small>`}</td><td>${escapeHtml(o.date)}</td></tr>`).join(''):`<tr><td colspan="8" class="empty">—</td></tr>`}</tbody></table></div>`;
    return;
  }
  if(tab==='coupons'){
    el.innerHTML=`<div class="section-head"><div><h3>${lang==='ar'?'الكوبونات':'Coupons'}</h3><span>${AD.coupons.length}</span></div><div class="spacer"></div><button class="btn gold" onclick="adCouponEditor()">＋ ${lang==='ar'?'كوبون':'Coupon'}</button></div><div class="tablewrap"><table class="table"><thead><tr><th>Code</th><th>${lang==='ar'?'الخصم':'Discount'}</th><th>${lang==='ar'?'حد أدنى':'Min order'}</th><th>${lang==='ar'?'الاستخدام':'Uses'}</th><th>${t('status')}</th><th></th></tr></thead><tbody>${AD.coupons.length?AD.coupons.map(c=>`<tr><td><b>${escapeHtml(c.code)}</b></td><td>${c.discount_type==='percent'?Number(c.discount_value)+'%':money(c.discount_value)}</td><td>${money(c.min_order)}</td><td>${c.uses_count}${c.max_uses?' / '+c.max_uses:''}</td><td><span class="status ${c.active?'ok':'warn'}">${c.active?t('active'):t('inactive')}</span></td><td><button class="btn small" onclick="adCouponEditor(${JSON.stringify(c.code)})">${t('edit')}</button> <button class="btn danger small" onclick="adDeleteCoupon(${JSON.stringify(c.code)})">${t('delete')}</button></td></tr>`).join(''):`<tr><td colspan="6" class="empty">${lang==='ar'?'لا توجد كوبونات':'No coupons'}</td></tr>`}</tbody></table></div>`;
    return;
  }
  if(tab==='shipping'){
    el.innerHTML=`<div class="section-head"><div><h3>${lang==='ar'?'إعدادات الشحن':'Shipping Rules'}</h3><span>${lang==='ar'?'0 = شحن مجاني دائماً':'0 = always free'}</span></div></div><div class="tablewrap"><table class="table"><thead><tr><th>${lang==='ar'?'الإمارة':'Emirate'}</th><th>${lang==='ar'?'الرسوم AED':'Fee AED'}</th><th>${lang==='ar'?'مجاني فوق AED':'Free over AED'}</th><th>${t('status')}</th><th></th></tr></thead><tbody>${AD.shipping.map((r,i)=>`<tr><td><b>${escapeHtml(r.emirate)}</b></td><td><input id="shipFee-${i}" type="number" min="0" step="0.01" value="${Number(r.fee||0)}"></td><td><input id="shipFree-${i}" type="number" min="0" step="0.01" value="${Number(r.free_over||0)}"></td><td><select id="shipActive-${i}"><option value="1" ${r.active?'selected':''}>${t('active')}</option><option value="0" ${!r.active?'selected':''}>${t('inactive')}</option></select></td><td><button class="btn small" onclick="adSaveShipping(${i})">${t('save')}</button></td></tr>`).join('')}</tbody></table></div>`;
    return;
  }
  if(tab==='inventory'){
    const low=adLowStockRows();
    el.innerHTML=`<div class="section-head"><div><h3>${lang==='ar'?'المخزون والحركة':'Inventory & Movements'}</h3><span>${AD.inventory.length}</span></div></div>${low.length?`<div class="notice"><b>⚠ ${lang==='ar'?'مخزون منخفض':'Low stock'}:</b> ${low.slice(0,8).map(x=>escapeHtml(x.p.name)+' / '+escapeHtml(x.v.size)+' ('+x.v.stock+')').join(' · ')}</div>`:''}<div class="tablewrap"><table class="table"><thead><tr><th>${t('date')}</th><th>${t('productName')}</th><th>${lang==='ar'?'التغيير':'Change'}</th><th>${lang==='ar'?'السبب':'Reason'}</th><th>${lang==='ar'?'ملاحظة':'Note'}</th></tr></thead><tbody>${AD.inventory.length?AD.inventory.map(m=>{const p=products.find(x=>x.id===m.product_id);return `<tr><td>${new Date(m.created_at).toLocaleString()}</td><td>${escapeHtml(p?.name||m.product_id)}</td><td><b style="color:${m.qty_change>0?'#7ce2a0':'#ffb0b0'}">${m.qty_change>0?'+':''}${m.qty_change}</b></td><td>${escapeHtml(m.reason)}</td><td>${escapeHtml(m.note||'')}</td></tr>`}).join(''):`<tr><td colspan="5" class="empty">—</td></tr>`}</tbody></table></div>`;
    return;
  }
  if(tab==='customers'){
    el.innerHTML=`<div class="section-head"><div><h3>${t('customers')}</h3><span>${customers.length}</span></div></div><div class="tablewrap"><table class="table"><thead><tr><th>${t('name')}</th><th>${t('email')}</th><th>${t('mobile')}</th><th>${lang==='ar'?'العنوان الافتراضي':'Default address'}</th><th>${t('date')}</th></tr></thead><tbody>${customers.length?customers.map(c=>`<tr><td><b>${escapeHtml(c.name||'—')}</b></td><td>${escapeHtml(c.email||'—')}</td><td>${escapeHtml(c.mobile||'—')}</td><td>${escapeHtml([c.default_emirate,c.default_city,c.default_address].filter(Boolean).join(' · '))}</td><td>${escapeHtml(c.created)}</td></tr>`).join(''):`<tr><td colspan="5" class="empty">—</td></tr>`}</tbody></table></div>`;
    return;
  }
  if(tab==='notifications'){
    const pending=AD.notifications.filter(n=>!n.sent_at);
    el.innerHTML=`<div class="section-head"><div><h3>${lang==='ar'?'إشعارات البريد':'Email Notifications'}</h3><span>${pending.length} ${lang==='ar'?'بانتظار الإرسال':'queued'}</span></div></div><div class="notice">${lang==='ar'?'أحداث البريد أصبحت تُسجّل تلقائياً عند الطلب وتغيير الحالة. الإرسال الخارجي يحتاج مفتاح إرسال محفوظاً بشكل آمن على السيرفر، لذلك لا يتم وضع أي مفتاح سري داخل التطبيق العام.':'Email events are queued automatically for new orders and status changes. External delivery requires a securely stored server-side sending key; no secret is exposed in the public app.'}</div><div class="tablewrap"><table class="table"><thead><tr><th>${t('date')}</th><th>${lang==='ar'?'النوع':'Type'}</th><th>${lang==='ar'?'المستلم':'Recipient'}</th><th>${t('status')}</th></tr></thead><tbody>${AD.notifications.length?AD.notifications.map(n=>`<tr><td>${new Date(n.created_at).toLocaleString()}</td><td>${escapeHtml(n.notification_type)}</td><td>${escapeHtml(n.recipient_email)}</td><td><span class="status ${n.sent_at?'ok':'warn'}">${n.sent_at?(lang==='ar'?'أُرسل':'Sent'):(lang==='ar'?'قائمة الانتظار':'Queued')}</span></td></tr>`).join(''):`<tr><td colspan="4" class="empty">—</td></tr>`}</tbody></table></div>`;
  }
}
async function adEnableBrowserNotifications(){
  if(!('Notification' in window))return toast(lang==='ar'?'الإشعارات غير مدعومة':'Notifications are not supported');
  const p=await Notification.requestPermission();toast(p==='granted'?(lang==='ar'?'تم تفعيل تنبيه الطلبات ✓':'New-order alerts enabled ✓'):(lang==='ar'?'لم يتم السماح بالإشعارات':'Notifications not allowed'));
}
async function adSubscribeNewOrders(){
  if(AD.orderChannel){try{await sb.removeChannel(AD.orderChannel)}catch(e){} AD.orderChannel=null}
  if(!currentUser||!isAdmin)return;
  AD.orderChannel=sb.channel('snb-admin-new-orders').on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},async payload=>{
    const msg=lang==='ar'?'🔴 وصل طلب جديد':'🔴 New order received';toast(msg);
    if('Notification' in window&&Notification.permission==='granted')new Notification('SNB Leather Goods',{body:msg,icon:'assets/SNB-App-Icon.png'});
    await loadAdminData();if(document.getElementById('adminApp'))renderAdminReplace(AD.currentTab||'dashboard');
  }).subscribe();
}
async function updateOrderTracking(id){
  const carrier=document.getElementById('carrier-'+id)?.value.trim()||'';
  const number=document.getElementById('tracking-'+id)?.value.trim()||'';
  const url=document.getElementById('trackingurl-'+id)?.value.trim()||'';
  if(url&&!/^https?:\/\//i.test(url))return toast(lang==='ar'?'رابط التتبع يجب أن يبدأ بـ https://':'Tracking link must start with https://');
  const {error}=await sb.from('orders').update({tracking_carrier:carrier||null,tracking_number:number||null,tracking_url:url||null,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)return toast(error.message||'Could not save tracking');
  const o=orders.find(x=>x.id===id);if(o){o.tracking_carrier=carrier;o.tracking_number=number;o.tracking_url=url}
  toast(lang==='ar'?'تم حفظ بيانات التتبع':'Tracking saved');
}
function adCouponEditor(code=''){
  const c=code?AD.coupons.find(x=>x.code===code):null;
  showModal(`<div class="modal-head"><h3>${c?(lang==='ar'?'تعديل كوبون':'Edit coupon'):(lang==='ar'?'كوبون جديد':'New coupon')}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div class="formgrid"><div class="field"><label>Code</label><input id="adcCode" value="${escapeHtml(c?.code||'')}" ${c?'disabled':''} style="text-transform:uppercase"></div><div class="field"><label>${lang==='ar'?'نوع الخصم':'Discount type'}</label><select id="adcType"><option value="percent" ${c?.discount_type==='percent'?'selected':''}>%</option><option value="fixed" ${c?.discount_type==='fixed'?'selected':''}>AED</option></select></div><div class="field"><label>${lang==='ar'?'قيمة الخصم':'Value'}</label><input id="adcValue" type="number" min="0.01" step="0.01" value="${Number(c?.discount_value||10)}"></div><div class="field"><label>${lang==='ar'?'الحد الأدنى للطلب':'Minimum order'}</label><input id="adcMin" type="number" min="0" step="0.01" value="${Number(c?.min_order||0)}"></div><div class="field"><label>${lang==='ar'?'أقصى عدد استخدام':'Max uses'}</label><input id="adcMax" type="number" min="1" value="${c?.max_uses??''}" placeholder="∞"></div><div class="field"><label>${t('status')}</label><select id="adcActive"><option value="1" ${c?.active!==false?'selected':''}>${t('active')}</option><option value="0" ${c?.active===false?'selected':''}>${t('inactive')}</option></select></div></div><button class="btn gold" style="width:100%" onclick="adSaveCoupon(${JSON.stringify(code)})">${t('save')}</button>`);
}
async function adSaveCoupon(oldCode=''){
  const code=(oldCode||document.getElementById('adcCode')?.value||'').trim().toUpperCase();
  const type=document.getElementById('adcType')?.value||'percent',value=Number(document.getElementById('adcValue')?.value||0),min=Number(document.getElementById('adcMin')?.value||0),maxRaw=document.getElementById('adcMax')?.value,active=document.getElementById('adcActive')?.value==='1';
  if(!/^[A-Z0-9_-]{3,30}$/.test(code)||value<=0)return toast(lang==='ar'?'تحقق من الكود وقيمة الخصم':'Check code and discount');
  if(type==='percent'&&value>100)return toast(lang==='ar'?'النسبة لا تتجاوز 100%':'Percent cannot exceed 100%');
  const obj={code,discount_type:type,discount_value:value,min_order:min,max_uses:maxRaw?Number(maxRaw):null,active,updated_at:new Date().toISOString()};
  const q=oldCode?sb.from('coupons').update(obj).eq('code',oldCode):sb.from('coupons').insert(obj);
  const {error}=await q;if(error)return toast(error.message);
  closeOverlay();await loadAdminData();renderAdminReplace('coupons');
}
async function adDeleteCoupon(code){
  if(!confirm(lang==='ar'?('حذف الكوبون '+code+'؟'):('Delete coupon '+code+'?')))return;
  const {error}=await sb.from('coupons').delete().eq('code',code);if(error)return toast(error.message);
  await loadAdminData();renderAdminReplace('coupons');
}
async function adSaveShipping(i){
  const r=AD.shipping[i];if(!r)return;
  const fee=Math.max(0,Number(document.getElementById('shipFee-'+i)?.value||0)),free_over=Math.max(0,Number(document.getElementById('shipFree-'+i)?.value||0)),active=document.getElementById('shipActive-'+i)?.value==='1';
  const {error}=await sb.from('shipping_rules').update({fee,free_over,active,updated_at:new Date().toISOString()}).eq('emirate',r.emirate);if(error)return toast(error.message);
  r.fee=fee;r.free_over=free_over;r.active=active;toast(lang==='ar'?'تم حفظ إعدادات الشحن':'Shipping rule saved');
}
function variantRowHtml(v={}){
  const safe=/^#[0-9a-f]{6}$/i.test(v.color||'')?v.color:'#111111';
  return `<div class="variant-row" style="display:grid;grid-template-columns:1fr 82px 1fr 92px 42px;gap:7px;align-items:end;margin-bottom:8px"><div class="field" style="margin:0"><label>${t('size')}</label><input class="variant-size" value="${escapeHtml(v.size||'One Size')}"></div><div class="field" style="margin:0"><label>${lang==='ar'?'لون':'Color'}</label><input class="variant-color" type="color" value="${safe}"></div><div class="field" style="margin:0"><label>${lang==='ar'?'اسم اللون':'Color name'}</label><input class="variant-color-name" value="${escapeHtml(v.color_name||'')}"></div><div class="field" style="margin:0"><label>${t('stock')}</label><input class="variant-stock" type="number" min="0" value="${Number(v.stock||0)}" oninput="refreshVariantStock()"></div><button type="button" class="btn danger small" onclick="this.closest('.variant-row').remove();refreshVariantStock()">✕</button></div>`;
}
function addVariantRow(size='One Size',color='#111111',stock=0,colorName=''){
  document.getElementById('variantRows')?.insertAdjacentHTML('beforeend',variantRowHtml({size,color,stock,color_name:colorName}));refreshVariantStock();
}
function editProduct(id=''){
  const p=id?products.find(x=>x.id===id):{id:'p'+Date.now(),name:'',category:'shoes',price:0,discount:0,stock:0,color:'#111111',type:'shoe',sizes:['40'],active:true,image_url:'',variants:[],product_images:[],is_new:true,is_best_seller:false,low_stock_threshold:2};
  const image=p.image_url||p.image||'',variants=p.variants?.length?p.variants:[{size:p.sizes?.[0]||'One Size',color:p.color||'#111111',color_name:'',stock:Number(p.stock||0)}];
  const gallery=psImages(p);
  showModal(`<div class="modal-head"><h3>${id?t('edit'):t('addProduct')}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
    <div class="field"><label>${lang==='ar'?'الصورة الرئيسية':'Main product photo'}</label>${image?`<img id="pImagePreview" class="image-preview" src="${escapeHtml(image)}" alt="">`:`<img id="pImagePreview" class="image-preview hidden" alt="">`}<input id="pImage" type="file" accept="image/jpeg,image/png,image/webp" onchange="previewProductImage(this)"></div>
    ${gallery.length?`<div style="display:flex;gap:7px;overflow:auto;margin-bottom:10px">${gallery.map(g=>`<div style="position:relative;min-width:62px;width:62px;aspect-ratio:4/5;border:1px solid var(--line);border-radius:10px;overflow:hidden"><img src="${escapeHtml(g.image_url)}" style="width:100%;height:100%;object-fit:contain">${g.id!=='primary'?`<button type="button" onclick="adDeleteGalleryImage('${g.id}','${p.id}')" style="position:absolute;top:2px;right:2px;border:0;border-radius:50%;background:#8b2525;color:#fff;width:22px;height:22px">×</button>`:''}</div>`).join('')}</div>`:''}
    <div class="field"><label>${lang==='ar'?'صور إضافية للـGallery':'Additional gallery photos'}</label><input id="pGallery" type="file" accept="image/jpeg,image/png,image/webp" multiple><small class="muted">${lang==='ar'?'يمكن اختيار عدة صور دفعة واحدة.':'You can select multiple images.'}</small></div>
    <div class="formgrid"><div class="field"><label>${t('productName')}</label><input id="pName" value="${escapeHtml(p.name)}"></div><div class="field"><label>${t('category')}</label><select id="pCat"><option value="shoes" ${p.category==='shoes'?'selected':''}>${t('shoes')}</option><option value="bags" ${p.category==='bags'?'selected':''}>${t('bags')}</option><option value="wallets" ${p.category==='wallets'?'selected':''}>${t('wallets')}</option></select></div><div class="field"><label>${t('price')} AED</label><input id="pPrice" type="number" min="0" step="0.01" value="${p.price}"></div><div class="field"><label>${t('discount')} %</label><input id="pDiscount" type="number" min="0" max="90" value="${p.discount}"></div><div class="field"><label>${lang==='ar'?'تنبيه مخزون عند':'Low stock threshold'}</label><input id="pLow" type="number" min="0" value="${p.low_stock_threshold??2}"></div><div class="field"><label>${t('status')}</label><select id="pActive"><option value="1" ${p.active?'selected':''}>${t('active')}</option><option value="0" ${!p.active?'selected':''}>${t('inactive')}</option></select></div></div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 14px"><label><input id="pNew" type="checkbox" ${p.is_new?'checked':''}> NEW</label><label><input id="pBest" type="checkbox" ${p.is_best_seller?'checked':''}> BEST SELLER</label></div>
    <div class="notice"><b>${lang==='ar'?'المقاسات / الألوان / المخزون':'Sizes / colors / stock'}</b></div><div id="variantRows">${variants.map(variantRowHtml).join('')}</div><div style="display:flex;gap:8px;align-items:center;margin:10px 0 14px"><button type="button" class="btn small" onclick="addVariantRow()">＋ ${lang==='ar'?'إضافة خيار':'Add option'}</button><span class="muted">${lang==='ar'?'إجمالي المخزون':'Total stock'}: <b id="variantStockTotal">${variants.reduce((s,v)=>s+Number(v.stock||0),0)}</b></span></div>
    <button id="saveProductBtn" class="btn gold" style="width:100%" onclick="saveProduct('${p.id}',${id?1:0})">${t('save')}</button>`);
}
async function adUploadProductImage(productId,file){
  const blob=await compressProductImageBlob(file);const path=`${productId}/${Date.now()}-${Math.random().toString(36).slice(2,7)}.webp`;
  const up=await sb.storage.from('product-images').upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:false});if(up.error)throw up.error;
  return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
async function saveProduct(id,exists){
  const name=document.getElementById('pName')?.value.trim()||'',cat=document.getElementById('pCat')?.value||'shoes',price=Number(document.getElementById('pPrice')?.value||0),discount=Number(document.getElementById('pDiscount')?.value||0),low=Math.max(0,Number(document.getElementById('pLow')?.value||2));
  const variants=[...document.querySelectorAll('.variant-row')].map(row=>({size:row.querySelector('.variant-size')?.value.trim()||'One Size',color:row.querySelector('.variant-color')?.value||'#111111',color_name:row.querySelector('.variant-color-name')?.value.trim()||null,stock:Math.max(0,Number(row.querySelector('.variant-stock')?.value||0))}));
  if(!name||price<0||discount<0||discount>90||!variants.length)return toast(lang==='ar'?'تحقق من بيانات المنتج':'Check product data');
  const keys=variants.map(v=>v.size.toLowerCase()+'|'+v.color.toLowerCase());if(new Set(keys).size!==keys.length)return toast(lang==='ar'?'يوجد خيار مقاس/لون مكرر':'Duplicate size/color option');
  const stock=variants.reduce((s,v)=>s+v.stock,0),sizes=[...new Set(variants.map(v=>v.size))],old=exists?products.find(x=>x.id===id):null;
  let image_url=old?.image_url||old?.image||null;const primary=document.getElementById('pImage')?.files?.[0],gallery=[...(document.getElementById('pGallery')?.files||[])],btn=document.getElementById('saveProductBtn');
  if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جارٍ الحفظ…':'Saving…'}
  try{
    if(primary)image_url=await adUploadProductImage(id,primary);
    const obj={id,name,category:cat,price,discount,stock,color:variants[0]?.color||'#111111',type:cat==='bags'?'bag':cat==='wallets'?'wallet':'shoe',sizes,active:document.getElementById('pActive')?.value==='1',image_url,is_new:!!document.getElementById('pNew')?.checked,is_best_seller:!!document.getElementById('pBest')?.checked,low_stock_threshold:low,updated_at:new Date().toISOString()};
    const q=exists?sb.from('products').update(obj).eq('id',id):sb.from('products').insert(obj);const saved=await q;if(saved.error)throw saved.error;
    const synced=await sb.rpc('sync_product_variants_v2',{p_product_id:id,p_variants:variants});if(synced.error)throw synced.error;
    const currentUrls=new Set((old?.product_images||[]).map(x=>x.image_url));
    if(image_url&&!currentUrls.has(image_url)){const add=await sb.from('product_images').insert({product_id:id,image_url,sort_order:0});if(add.error)throw add.error}
    let order=(old?.product_images||[]).length+1;
    for(const f of gallery){const url=await adUploadProductImage(id,f);const add=await sb.from('product_images').insert({product_id:id,image_url:url,sort_order:order++});if(add.error)throw add.error}
    closeOverlay();await loadAdminData();renderAdminReplace('products');
  }catch(e){if(btn){btn.disabled=false;btn.textContent=t('save')}toast(e.message||'Could not save product')}
}
const adBaseExitAdmin=exitAdmin;
exitAdmin=async function(){if(AD.orderChannel){try{await sb.removeChannel(AD.orderChannel)}catch(e){} AD.orderChannel=null}return adBaseExitAdmin()};
async function adDeleteGalleryImage(imageId,productId){
  const {error}=await sb.from('product_images').delete().eq('id',imageId);if(error)return toast(error.message);
  await loadAdminData();editProduct(productId);
}
