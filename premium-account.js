// SNB Premium Account & Checkout Layer v1
const PA={addresses:[],shippingRules:[],couponCode:'',couponDiscount:0};

function paSafeUrl(v){
  try{const u=new URL(String(v||''));return ['http:','https:'].includes(u.protocol)?u.href:''}catch(e){return ''}
}
async function paLoadCommerceData(){
  if(!currentUser){PA.addresses=[];PA.shippingRules=[];return}
  const [ad,sr]=await Promise.all([
    sb.from('customer_addresses').select('*').eq('user_id',currentUser.id).order('is_default',{ascending:false}).order('created_at',{ascending:false}),
    sb.from('shipping_rules').select('*').eq('active',true)
  ]);
  PA.addresses=ad.error?[]:(ad.data||[]);
  PA.shippingRules=sr.error?[]:(sr.data||[]);
}
function paCartTotals(){
  const items=cart.map(i=>{
    const p=products.find(x=>x.id===i.id);
    return p?{...i,p}:null;
  }).filter(Boolean);
  const subtotal=items.reduce((s,i)=>s+Number(i.p.price||0)*Number(i.qty||0),0);
  const merch=items.reduce((s,i)=>s+finalPrice(i.p)*Number(i.qty||0),0);
  return {subtotal,merch,productDiscount:Math.max(0,subtotal-merch)};
}
function paShippingFee(emirate,net){
  const r=PA.shippingRules.find(x=>x.emirate===emirate);
  if(!r)return 0;
  const fee=Number(r.fee||0),freeOver=Number(r.free_over||0);
  return freeOver===0||Number(net||0)>=freeOver?0:fee;
}
function paUpdateCheckoutTotals(){
  const {subtotal,merch,productDiscount}=paCartTotals();
  const net=Math.max(0,merch-Number(PA.couponDiscount||0));
  const emirate=document.getElementById('checkoutEmirate')?.value||'Dubai';
  const shipping=paShippingFee(emirate,net);
  const total=net+shipping;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=money(v)};
  set('paSubtotal',subtotal);set('paProductDiscount',productDiscount);set('paCouponDiscount',PA.couponDiscount);set('paShipping',shipping);set('paTotal',total);
}
async function paApplyCoupon(){
  const code=document.getElementById('couponCode')?.value.trim().toUpperCase()||'';
  if(!code){PA.couponCode='';PA.couponDiscount=0;paUpdateCheckoutTotals();return toast(lang==='ar'?'أدخل كود الخصم':'Enter a coupon code')}
  const {merch}=paCartTotals();
  const {data,error}=await sb.rpc('validate_coupon',{p_code:code,p_amount:merch});
  if(error)return toast(error.message||'Coupon failed');
  const r=data?.[0];
  if(!r?.valid){PA.couponCode='';PA.couponDiscount=0;paUpdateCheckoutTotals();return toast(lang==='ar'?'الكوبون غير صالح أو غير متاح':(r?.message||'Invalid coupon'))}
  PA.couponCode=code;PA.couponDiscount=Number(r.discount||0);paUpdateCheckoutTotals();
  toast(lang==='ar'?('تم تطبيق الخصم '+money(PA.couponDiscount)):('Coupon applied: '+money(PA.couponDiscount)));
}
function paUseAddress(id){
  const a=PA.addresses.find(x=>x.id===id);if(!a)return;
  const em=document.getElementById('checkoutEmirate');if(em)em.value=a.emirate||'Dubai';
  const ci=document.getElementById('checkoutCity');if(ci)ci.value=a.city||'';
  const ad=document.getElementById('address');if(ad)ad.value=a.address||'';
  paUpdateCheckoutTotals();
}
function paUseLastOrder(){
  const o=myOrders?.[0];if(!o)return;
  const em=document.getElementById('checkoutEmirate');if(em&&o.emirate)em.value=o.emirate;
  const ci=document.getElementById('checkoutCity');if(ci)ci.value=o.city||'';
  const ad=document.getElementById('address');if(ad)ad.value=o.address||'';
  paUpdateCheckoutTotals();
}
async function checkout(){
  if(!currentUser){closeOverlay();localStorage.setItem('snb_pending_checkout','1');openAuth(true);return}
  if(!cart.length)return toast(t('emptyCart'));
  if(typeof repairCart==='function')repairCart();
  await paLoadCommerceData();
  PA.couponCode='';PA.couponDiscount=0;
  const emirates=['Dubai','Abu Dhabi','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah'];
  const def=PA.addresses.find(x=>x.is_default)||PA.addresses[0]||{};
  const profile=currentUser||{};
  showModal(`<div class="modal-head"><h3>${t('checkout')}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
    <div class="notice">🔒 ${lang==='ar'?'طلبك مربوط بحسابك ويتم التحقق من المخزون عند التأكيد.':'Your order is linked to your account and stock is rechecked at confirmation.'}</div>
    ${PA.addresses.length?`<div class="field"><label>${lang==='ar'?'عنوان محفوظ':'Saved address'}</label><select onchange="if(this.value)paUseAddress(this.value)"><option value="">${lang==='ar'?'اختر عنواناً…':'Choose an address…'}</option>${PA.addresses.map(a=>`<option value="${a.id}" ${a.id===def.id?'selected':''}>${escapeHtml(a.label||'Address')} · ${escapeHtml(a.emirate)} · ${escapeHtml(a.city)}</option>`).join('')}</select></div>`:''}
    ${myOrders?.length?`<button class="btn small" style="margin-bottom:10px" onclick="paUseLastOrder()">↻ ${lang==='ar'?'استخدم عنوان آخر طلب':'Use last order address'}</button>`:''}
    <div class="formgrid">
      <div class="field"><label>${t('name')}</label><input id="checkoutName" value="${escapeHtml(profile.name||'')}" autocomplete="name"></div>
      <div class="field"><label>${t('mobile')}</label><input id="checkoutMobile" value="${escapeHtml(profile.mobile||'')}" inputmode="tel" autocomplete="tel"></div>
      <div class="field"><label>${lang==='ar'?'الإمارة':'Emirate'}</label><select id="checkoutEmirate" onchange="paUpdateCheckoutTotals()">${emirates.map(x=>`<option value="${x}" ${x===(def.emirate||'Dubai')?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>${lang==='ar'?'المدينة / المنطقة':'City / Area'}</label><input id="checkoutCity" value="${escapeHtml(def.city||'')}" placeholder="${lang==='ar'?'مثال: البرشاء 1':'e.g. Al Barsha 1'}"></div>
    </div>
    <div class="field"><label>${lang==='ar'?'عنوان التوصيل بالتفصيل':'Detailed delivery address'}</label><textarea id="address" rows="3">${escapeHtml(def.address||'')}</textarea></div>
    <label style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input id="saveCheckoutAddress" type="checkbox" ${PA.addresses.length?'':'checked'}> <span class="muted">${lang==='ar'?'حفظ هذا العنوان للمرة القادمة':'Save this address for next time'}</span></label>
    <div class="field"><label>${lang==='ar'?'كود الخصم':'Coupon code'}</label><div style="display:flex;gap:8px"><input id="couponCode" style="text-transform:uppercase"><button class="btn" onclick="paApplyCoupon()">${lang==='ar'?'تطبيق':'Apply'}</button></div></div>
    <div class="field"><label>${lang==='ar'?'ملاحظات الطلب':'Order notes'}</label><textarea id="orderNotes" rows="2" maxlength="1000" placeholder="${lang==='ar'?'اختياري':'Optional'}"></textarea></div>
    <div class="field"><label>${lang==='ar'?'طريقة الدفع':'Payment method'}</label><select id="paymentMethod"><option value="cash_on_delivery">${lang==='ar'?'الدفع عند الاستلام':'Cash on delivery'}</option><option value="bank_transfer">${lang==='ar'?'تحويل بنكي':'Bank transfer'}</option><option value="whatsapp">${lang==='ar'?'تأكيد عبر واتساب':'Confirm via WhatsApp'}</option></select></div>
    <div class="totals">
      <div class="totalrow"><span>${t('subtotal')}</span><span id="paSubtotal"></span></div>
      <div class="totalrow"><span>${lang==='ar'?'خصم المنتجات':'Product savings'}</span><span>− <span id="paProductDiscount"></span></span></div>
      <div class="totalrow"><span>${lang==='ar'?'الكوبون':'Coupon'}</span><span>− <span id="paCouponDiscount"></span></span></div>
      <div class="totalrow"><span>${t('shipping')}</span><span id="paShipping"></span></div>
      <div class="totalrow big"><span>${t('total')}</span><span id="paTotal"></span></div>
    </div>
    <button id="placeOrderBtn" class="btn gold" style="width:100%" onclick="placeOrder()">${lang==='ar'?'تأكيد الطلب':'Place order'}</button>`);
  setTimeout(()=>{if(def.id)paUseAddress(def.id);paUpdateCheckoutTotals()},0);
}
async function paSaveAddressIfNeeded(emirate,city,address){
  if(!document.getElementById('saveCheckoutAddress')?.checked)return;
  if(PA.addresses.length){
    await sb.from('customer_addresses').update({is_default:false}).eq('user_id',currentUser.id).eq('is_default',true);
  }
  await sb.from('customer_addresses').insert({user_id:currentUser.id,label:lang==='ar'?'العنوان الرئيسي':'Main address',emirate,city,address,is_default:true});
}
async function placeOrder(){
  const name=document.getElementById('checkoutName')?.value.trim()||'';
  const mobile=document.getElementById('checkoutMobile')?.value.trim()||'';
  const emirate=document.getElementById('checkoutEmirate')?.value.trim()||'';
  const city=document.getElementById('checkoutCity')?.value.trim()||'';
  const address=document.getElementById('address')?.value.trim()||'';
  const notes=document.getElementById('orderNotes')?.value.trim()||'';
  const payment=document.getElementById('paymentMethod')?.value||'cash_on_delivery';
  if(name.length<2)return toast(lang==='ar'?'أدخل الاسم':'Enter your name');
  if(mobile.length<6)return toast(lang==='ar'?'أدخل رقم الموبايل':'Enter your mobile number');
  if(city.length<2)return toast(lang==='ar'?'أدخل المدينة أو المنطقة':'Enter city or area');
  if(address.length<5)return toast(lang==='ar'?'أدخل عنوان التوصيل':'Enter delivery address');
  const btn=document.getElementById('placeOrderBtn');if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جارٍ إنشاء الطلب…':'Creating order…'}
  const payload=cart.map(i=>({id:i.id,variant_id:i.variantId||i.variant_id,size:i.size,color:i.color,qty:i.qty}));
  const {data,error}=await sb.rpc('place_order_v3',{p_items:payload,p_customer_name:name,p_mobile:mobile,p_emirate:emirate,p_city:city,p_address:address,p_notes:notes||null,p_payment_method:payment,p_coupon_code:PA.couponCode||null});
  if(error){if(btn){btn.disabled=false;btn.textContent=lang==='ar'?'تأكيد الطلب':'Place order'}toast(error.message||'Order failed');await loadProducts();return}
  await sb.from('customers').update({name,mobile,default_emirate:emirate,default_city:city,default_address:address}).eq('id',currentUser.id);
  await paSaveAddressIfNeeded(emirate,city,address);
  currentUser={...currentUser,name,mobile};
  const o=data?.[0];cart=[];saveLocal();updateCartBadge();await Promise.all([loadProducts(),loadMyOrders()]);
  showModal(`<div class="success"><div class="check">✓</div><h3>${lang==='ar'?'تم استلام طلبك بنجاح':'Order received successfully'}</h3><p>${t('orderNo')}: <b>${escapeHtml(o?.order_no||'SNB')}</b></p><p style="color:#f2cf7b;font-size:22px"><b>${money(o?.total||0)}</b></p>${Number(o?.coupon_discount||0)>0?`<p class="muted">${lang==='ar'?'وفّرت بالكوبون':'Coupon saved'} ${money(o.coupon_discount)}</p>`:''}<p class="muted">${lang==='ar'?'تابع كل مرحلة ووقت تحديثها من حسابك.':'Track every stage and timestamp from My Account.'}</p><button class="btn gold" onclick="closeOverlay();renderAccount()">${lang==='ar'?'تتبّع الطلب':'Track order'}</button></div>`);
}
async function loadMyOrders(){
  if(!currentUser){myOrders=[];return}
  const {data,error}=await sb.from('orders').select('id,order_no,total,subtotal,discount_amount,shipping_fee,coupon_code,coupon_discount,status,payment_method,address,emirate,city,notes,tracking_number,tracking_carrier,tracking_url,created_at,updated_at,order_items(product_id,product_name,size,color,color_name,qty,unit_price,image_url,variant_id),order_status_history(status,created_at)').eq('user_id',currentUser.id).order('created_at',{ascending:false});
  if(!error)myOrders=data||[];
}
function paTimeline(o){
  if(o.status==='cancelled')return `<div class="notice" style="border-color:rgba(209,96,96,.4);color:#ffb0b0">✕ ${statusLabel(o.status)}</div>`;
  const steps=['received','confirmed','preparing','shipped','out_for_delivery','delivered'];
  const history=(o.order_status_history||[]).slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const current=Math.max(0,steps.indexOf(o.status));
  return `<div style="display:grid;gap:7px;margin:12px 0">${steps.map((s,i)=>{const h=history.find(x=>x.status===s);return `<div style="display:grid;grid-template-columns:18px 1fr auto;gap:8px;align-items:center;opacity:${i<=current?'1':'.4'}"><span style="width:12px;height:12px;border-radius:50%;background:${i<=current?'#d7a84e':'#51483b'}"></span><b style="font-size:12px">${escapeHtml(statusLabel(s))}</b><small class="muted">${h?new Date(h.created_at).toLocaleString():''}</small></div>`}).join('')}</div>`;
}
function paReorder(index){
  const o=myOrders[index];if(!o)return;
  let added=0,skipped=0;
  for(const item of o.order_items||[]){
    const p=products.find(x=>x.id===item.product_id);
    if(!p){skipped++;continue}
    let v=(p.variants||[]).find(x=>x.id===item.variant_id)||(p.variants||[]).find(x=>x.size===item.size&&x.color===item.color);
    if(!v||v.stock<1){skipped++;continue}
    const existing=cart.find(x=>x.id===p.id&&(x.variantId||x.variant_id)===v.id);
    const wanted=Math.min(Number(item.qty||1),v.stock);
    if(existing)existing.qty=Math.min(v.stock,Number(existing.qty||0)+wanted);
    else cart.push({id:p.id,variantId:v.id,qty:wanted,size:v.size,color:v.color});
    added+=wanted;
  }
  saveLocal();updateCartBadge();
  toast(added?(lang==='ar'?`تمت إضافة ${added} قطعة للسلة`:`${added} item(s) added`):(lang==='ar'?'الخيارات السابقة غير متوفرة حالياً':'Previous options are unavailable'));
  if(skipped)console.info('SNB reorder skipped',skipped);
  openCart();
}
function paOrderDetails(index){
  const o=myOrders[index];if(!o)return;
  const track=paSafeUrl(o.tracking_url);
  showModal(`<div class="modal-head"><h3>${escapeHtml(o.order_no)}</h3><button class="iconbtn close" onclick="renderAccount()">✕</button></div>
    ${paTimeline(o)}
    <div style="display:grid;gap:10px">${(o.order_items||[]).map(i=>`<div style="display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:10px"><div class="cart-thumb" style="width:64px">${i.image_url?`<img src="${escapeHtml(i.image_url)}" alt="">`:'◇'}</div><div><b>${escapeHtml(i.product_name)}</b><div class="muted" style="font-size:12px">${escapeHtml(i.size||'')} · ${escapeHtml(i.color_name||i.color||'')}</div><small>${lang==='ar'?'الكمية':'Qty'}: ${i.qty}</small></div><b>${money(Number(i.unit_price||0)*Number(i.qty||0))}</b></div>`).join('')}</div>
    <div class="notice" style="margin-top:14px">${escapeHtml([o.emirate,o.city,o.address].filter(Boolean).join(' · '))}${o.notes?`<br><small>${escapeHtml(o.notes)}</small>`:''}</div>
    ${o.tracking_number?`<div class="notice">🚚 <b>${lang==='ar'?'رقم التتبع':'Tracking'}:</b> ${escapeHtml(o.tracking_number)}${o.tracking_carrier?` · ${escapeHtml(o.tracking_carrier)}`:''}${track?`<br><a class="btn small" style="display:inline-block;margin-top:8px;text-decoration:none" href="${escapeHtml(track)}" target="_blank" rel="noopener">${lang==='ar'?'تتبّع الشحنة':'Track shipment'}</a>`:''}</div>`:''}
    <div class="totals"><div class="totalrow"><span>${lang==='ar'?'الشحن':'Shipping'}</span><span>${money(o.shipping_fee||0)}</span></div>${Number(o.coupon_discount||0)>0?`<div class="totalrow"><span>${lang==='ar'?'خصم الكوبون':'Coupon'}</span><span>− ${money(o.coupon_discount)}</span></div>`:''}<div class="totalrow big"><span>${t('total')}</span><span>${money(o.total)}</span></div></div>
    <button class="btn gold" style="width:100%;margin-top:8px" onclick="paReorder(${index})">↻ ${lang==='ar'?'إعادة الطلب':'Reorder'}</button>`);
}
async function paProfileEditor(){
  await paLoadCommerceData();
  showModal(`<div class="modal-head"><h3>${lang==='ar'?'بياناتي وعناويني':'Profile & Addresses'}</h3><button class="iconbtn close" onclick="renderAccount()">✕</button></div>
    <div class="formgrid"><div class="field"><label>${t('name')}</label><input id="paName" value="${escapeHtml(currentUser.name||'')}"></div><div class="field"><label>${t('mobile')}</label><input id="paMobile" value="${escapeHtml(currentUser.mobile||'')}"></div></div>
    <button class="btn gold" style="width:100%;margin-bottom:14px" onclick="paSaveProfile()">${t('save')}</button>
    <h4>${lang==='ar'?'العناوين المحفوظة':'Saved addresses'}</h4>
    <div id="paAddressList">${PA.addresses.length?PA.addresses.map(a=>`<div class="notice"><b>${escapeHtml(a.label||'Address')}${a.is_default?' ★':''}</b><br>${escapeHtml([a.emirate,a.city,a.address].filter(Boolean).join(' · '))}<div style="display:flex;gap:6px;margin-top:8px">${!a.is_default?`<button class="btn small" onclick="paMakeDefault('${a.id}')">${lang==='ar'?'اجعله الافتراضي':'Make default'}</button>`:''}<button class="btn danger small" onclick="paDeleteAddress('${a.id}')">${t('delete')}</button></div></div>`).join(''):`<div class="empty">${lang==='ar'?'لا توجد عناوين محفوظة':'No saved addresses'}</div>`}</div>
    <button class="btn" style="width:100%" onclick="paAddressEditor()">＋ ${lang==='ar'?'إضافة عنوان':'Add address'}</button>`);
}
async function paSaveProfile(){
  const name=document.getElementById('paName')?.value.trim()||'',mobile=document.getElementById('paMobile')?.value.trim()||'';
  if(name.length<2||mobile.length<6)return toast(lang==='ar'?'تحقق من الاسم والموبايل':'Check name and mobile');
  const {error}=await sb.from('customers').update({name,mobile}).eq('id',currentUser.id);if(error)return toast(error.message);
  currentUser={...currentUser,name,mobile};updateAuthUI();toast(lang==='ar'?'تم حفظ البيانات':'Profile saved');paProfileEditor();
}
function paAddressEditor(){
  const emirates=['Dubai','Abu Dhabi','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah'];
  showModal(`<div class="modal-head"><h3>${lang==='ar'?'عنوان جديد':'New address'}</h3><button class="iconbtn close" onclick="paProfileEditor()">✕</button></div><div class="field"><label>${lang==='ar'?'اسم العنوان':'Label'}</label><input id="paaLabel" value="${lang==='ar'?'المنزل':'Home'}"></div><div class="formgrid"><div class="field"><label>${lang==='ar'?'الإمارة':'Emirate'}</label><select id="paaEmirate">${emirates.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>${lang==='ar'?'المدينة / المنطقة':'City / Area'}</label><input id="paaCity"></div></div><div class="field"><label>${lang==='ar'?'العنوان':'Address'}</label><textarea id="paaAddress" rows="3"></textarea></div><label style="display:flex;gap:8px;margin-bottom:12px"><input id="paaDefault" type="checkbox"> ${lang==='ar'?'العنوان الافتراضي':'Default address'}</label><button class="btn gold" style="width:100%" onclick="paAddAddress()">${t('save')}</button>`);
}
async function paAddAddress(){
  const label=document.getElementById('paaLabel')?.value.trim()||'Home',emirate=document.getElementById('paaEmirate')?.value||'Dubai',city=document.getElementById('paaCity')?.value.trim()||'',address=document.getElementById('paaAddress')?.value.trim()||'',isDefault=!!document.getElementById('paaDefault')?.checked;
  if(city.length<2||address.length<5)return toast(lang==='ar'?'أكمل بيانات العنوان':'Complete the address');
  if(isDefault)await sb.from('customer_addresses').update({is_default:false}).eq('user_id',currentUser.id).eq('is_default',true);
  const {error}=await sb.from('customer_addresses').insert({user_id:currentUser.id,label,emirate,city,address,is_default:isDefault||PA.addresses.length===0});if(error)return toast(error.message);
  toast(lang==='ar'?'تم حفظ العنوان':'Address saved');paProfileEditor();
}
async function paMakeDefault(id){
  await sb.from('customer_addresses').update({is_default:false}).eq('user_id',currentUser.id).eq('is_default',true);
  const {error}=await sb.from('customer_addresses').update({is_default:true}).eq('id',id).eq('user_id',currentUser.id);if(error)return toast(error.message);
  paProfileEditor();
}
async function paDeleteAddress(id){
  const {error}=await sb.from('customer_addresses').delete().eq('id',id).eq('user_id',currentUser.id);if(error)return toast(error.message);
  paProfileEditor();
}
async function paEnableBrowserNotifications(){
  if(!('Notification' in window))return toast(lang==='ar'?'الإشعارات غير مدعومة على هذا الجهاز':'Notifications are not supported');
  const p=await Notification.requestPermission();toast(p==='granted'?(lang==='ar'?'تم تفعيل إشعارات الطلب':'Order notifications enabled'):(lang==='ar'?'لم يتم السماح بالإشعارات':'Notification permission not granted'));
}
function accountOrdersHtml(){
  return myOrders.length?myOrders.map((o,idx)=>`<div style="border:1px solid var(--line);border-radius:16px;padding:13px;margin-bottom:11px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${escapeHtml(o.order_no)}</b><span class="status ${o.status==='cancelled'?'warn':'ok'}">${escapeHtml(statusLabel(o.status))}</span></div><div class="muted" style="font-size:12px;margin-top:6px">${new Date(o.created_at).toLocaleString()}</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px"><b style="color:#f2cf7b">${money(o.total)}</b><button class="btn small" onclick="paOrderDetails(${idx})">${lang==='ar'?'التفاصيل':'Details'}</button></div></div>`).join(''):`<div class="empty">${lang==='ar'?'لا توجد طلبات بعد':'No orders yet'}</div>`;
}
async function renderAccount(){
  if(!currentUser)return renderAuth('login');
  await loadMyOrders();
  showModal(`<div class="modal-head"><h3>${accountLabel()}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div class="success" style="padding:8px 4px 14px"><div class="check">✓</div><h3 style="margin:8px 0">${escapeHtml(currentUser.name||signedInLabel())}</h3><div class="notice" style="margin:12px 0"><b>${escapeHtml(currentUser.email||'')}</b>${currentUser.mobile?`<br><small>${escapeHtml(currentUser.mobile)}</small>`:''}</div></div><div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn" style="flex:1" onclick="paProfileEditor()">✎ ${lang==='ar'?'بياناتي':'Profile'}</button><button class="btn" style="flex:1" onclick="paEnableBrowserNotifications()">🔔 ${lang==='ar'?'إشعارات':'Alerts'}</button></div><h4 style="margin:8px 0 10px">${lang==='ar'?'طلباتي وتتبع الشحن':'My Orders & Tracking'}</h4><div id="accountOrders">${accountOrdersHtml()}</div><button class="btn ghost" style="width:100%;margin-top:12px" onclick="logoutCustomer()">${t('logout')}</button>`);
}
async function subscribeOrderUpdates(){
  if(window.snbOrderChannel){try{await sb.removeChannel(window.snbOrderChannel)}catch(e){} window.snbOrderChannel=null}
  if(typeof orderStatusChannel!=='undefined'&&orderStatusChannel){try{await sb.removeChannel(orderStatusChannel)}catch(e){} orderStatusChannel=null}
  if(typeof orderChannel!=='undefined'&&orderChannel){try{await sb.removeChannel(orderChannel)}catch(e){} orderChannel=null}
  if(!currentUser)return;
  window.snbOrderChannel=sb.channel('snb-premium-orders-'+currentUser.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:`user_id=eq.${currentUser.id}`},async payload=>{
    await loadMyOrders();const box=document.getElementById('accountOrders');if(box)box.innerHTML=accountOrdersHtml();
    const msg=lang==='ar'?`تحديث الطلب: ${statusLabel(payload.new?.status)}`:`Order update: ${statusLabel(payload.new?.status)}`;toast(msg);
    if('Notification' in window&&Notification.permission==='granted')new Notification('SNB Leather Goods',{body:msg,icon:'assets/SNB-App-Icon.png'});
  }).subscribe();
}
const paBaseLogout=logoutCustomer;
logoutCustomer=async function(){if(window.snbOrderChannel){try{await sb.removeChannel(window.snbOrderChannel)}catch(e){} window.snbOrderChannel=null}return paBaseLogout()};
(function paSplash(){
  if(sessionStorage.getItem('snbSplashShown'))return;sessionStorage.setItem('snbSplashShown','1');
  const d=document.createElement('div');d.id='paSplash';d.style='position:fixed;inset:0;z-index:9999;background:radial-gradient(circle at 50% 35%,#21170d,#070605 60%);display:grid;place-items:center;transition:opacity .45s';
  d.innerHTML='<div style="text-align:center"><img src="assets/SNB-App-Icon.png" style="width:116px;height:116px;border-radius:30px;box-shadow:0 0 65px rgba(215,168,78,.28)"><div style="font-family:Georgia,serif;color:#f3d58c;letter-spacing:.14em;font-size:20px;margin-top:18px">SNB LEATHER GOODS</div><div style="width:120px;height:2px;margin:14px auto;background:linear-gradient(90deg,transparent,#d7a84e,transparent)"></div><small style="color:#b9ad9a;letter-spacing:.14em">SUBSTANCE · NUANCE · BRILLIANCE</small></div>';
  document.body.appendChild(d);setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),480)},900);
})();
setTimeout(()=>{if(currentUser)paLoadCommerceData()},200);
