
// ===== SNB Commerce Upgrade: variants, checkout, order tracking, realtime =====
let searchTerm='';
let orderStatusChannel=null;

function productVariants(p){
  const rows=Array.isArray(p?.variants)?p.variants:[];
  return rows.map(v=>({...v,stock:Number(v.stock||0)}));
}
function getVariant(p,variantId=''){
  const vs=productVariants(p);
  return vs.find(v=>v.id===variantId)||null;
}
function firstAvailableVariant(p){
  return productVariants(p).find(v=>v.stock>0)||productVariants(p)[0]||null;
}
function setSearch(value=''){
  searchTerm=String(value||'').trim().toLowerCase();
  renderProducts();
}
function normalizeProduct(p){
  const variants=(Array.isArray(p.product_variants)?p.product_variants:Array.isArray(p.variants)?p.variants:[])
    .map(v=>({...v,stock:Number(v.stock||0)}));
  const fallbackSizes=Array.isArray(p.sizes)?p.sizes:String(p.sizes||'One Size').split(',').map(s=>s.trim()).filter(Boolean);
  const sizes=variants.length?[...new Set(variants.map(v=>v.size||'One Size'))]:fallbackSizes;
  const variantStock=variants.length?variants.reduce((s,v)=>s+Number(v.stock||0),0):Number(p.stock||0);
  return {
    ...p,
    price:Number(p.price||0),
    discount:Number(p.discount||0),
    stock:variantStock,
    sizes,
    variants,
    image:p.image_url||p.image||''
  };
}
function applyLang(){
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  const ls=document.getElementById('langSelect');
  if(ls)ls.value=lang;
  const search=document.getElementById('productSearch');
  if(search)search.placeholder=lang==='ar'?'ابحث عن منتج…':'Search products…';
  renderFilters();
  renderProducts();
  updateCartBadge();
  updateAuthUI();
}
async function loadProducts(){
  const {data,error}=await sb.from('products').select('*,product_variants(*)').order('created_at',{ascending:false});
  if(error){console.error(error);return false}
  products=(data||[]).map(normalizeProduct);
  repairCart();
  renderProducts();
  return true;
}
function repairCart(){
  let changed=false;
  cart=cart.map(item=>{
    const p=products.find(x=>x.id===item.id);
    if(!p)return null;
    let v=getVariant(p,item.variantId);
    if(!v&&item.size)v=productVariants(p).find(x=>x.size===item.size&&(!item.color||x.color===item.color))||null;
    if(!v)v=firstAvailableVariant(p);
    if(!v||v.stock<1)return null;
    const qty=Math.min(Math.max(Number(item.qty||1),1),v.stock);
    if(item.variantId!==v.id||item.size!==v.size||item.color!==v.color||item.qty!==qty)changed=true;
    return {id:p.id,variantId:v.id,size:v.size,color:v.color,qty};
  }).filter(Boolean);
  if(changed)saveLocal();
  updateCartBadge();
}
function renderProducts(){
  const list=products.filter(p=>{
    const categoryOk=category==='all'||p.category===category;
    const searchOk=!searchTerm||String(p.name||'').toLowerCase().includes(searchTerm);
    return p.active&&categoryOk&&searchOk;
  });
  const grid=document.getElementById('productGrid');
  if(!grid)return;
  grid.innerHTML=list.map(p=>{
    const available=productVariants(p).filter(v=>v.stock>0).length;
    return `<article class="product">${p.discount?`<div class="sale">-${p.discount}%</div>`:''}
      <button aria-label="Wishlist" onclick="toggleWishlist(event,'${p.id}')" style="position:absolute;top:10px;right:10px;z-index:4;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:rgba(8,7,5,.86);color:${wishlist.has(p.id)?'#f3d58c':'#fff'};font-size:20px;cursor:pointer">${wishlist.has(p.id)?'♥':'♡'}</button>
      <div class="product-media" onclick="viewProduct('${p.id}')">${productVisual(p)}</div>
      <div class="product-body">
        <h4>${escapeHtml(p.name)}</h4>
        <div class="price"><strong>${money(finalPrice(p))}</strong>${p.discount?`<span class="old">${money(p.price)}</span>`:''}</div>
        <div class="meta"><span>${t('stock')}: ${p.stock}</span><span>${available?available+' '+(lang==='ar'?'خيارات':'options'):''}</span></div>
        <div class="product-actions"><button class="btn gold small" ${p.stock<1?'disabled':''} onclick="addToCart('${p.id}')">${p.stock<1?(lang==='ar'?'نفد المخزون':'Out of stock'):t('addCart')}</button><button class="btn small" onclick="viewProduct('${p.id}')">⌕</button></div>
      </div>
    </article>`;
  }).join('')||`<div class="empty" style="grid-column:1/-1">${lang==='ar'?'لا توجد منتجات مطابقة':'No matching products'}</div>`;
}
function addToCart(id,variantId=''){
  const p=products.find(x=>x.id===id);
  if(!p)return;
  const v=getVariant(p,variantId)||firstAvailableVariant(p);
  if(!v||v.stock<1)return toast(lang==='ar'?'نفد المخزون':'Out of stock');
  const found=cart.find(i=>i.id===id&&i.variantId===v.id);
  const inCart=found?Number(found.qty||0):0;
  if(inCart>=v.stock)return toast(lang==='ar'?`المتوفر لهذا الخيار فقط ${v.stock} قطعة`:`Only ${v.stock} available for this option`);
  if(found)found.qty++;
  else cart.push({id,variantId:v.id,qty:1,size:v.size,color:v.color});
  saveLocal();
  updateCartBadge();
  toast(t('addCart')+' ✓');
}
function updateVariantPreview(id){
  const p=products.find(x=>x.id===id);
  if(!p)return;
  const select=document.getElementById('modalVariant');
  const v=getVariant(p,select?.value);
  const stock=document.getElementById('modalVariantStock');
  const swatch=document.getElementById('modalVariantSwatch');
  if(stock)stock.textContent=String(v?.stock||0);
  if(swatch)swatch.style.background=v?.color||'#222';
}
function viewProduct(id){
  const p=products.find(x=>x.id===id);
  if(!p)return;
  const variants=productVariants(p);
  const first=variants.find(v=>v.stock>0)||variants[0];
  showModal(`<div class="modal-head"><h3>${escapeHtml(p.name)}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="productdetail">
      <div class="product-media product-detail-media" style="border-radius:18px">${productVisual(p)}</div>
      <div>
        <div class="price"><strong style="font-size:25px">${money(finalPrice(p))}</strong>${p.discount?`<span class="old">${money(p.price)}</span>`:''}</div>
        <p class="muted">SNB Leather Goods · SUBSTANCE • NUANCE • BRILLIANCE</p>
        <div class="field"><label>${lang==='ar'?'المقاس / اللون':'Size / Color'}</label>
          <select id="modalVariant" onchange="updateVariantPreview('${p.id}')">${variants.map(v=>`<option value="${v.id}" ${v.id===first?.id?'selected':''} ${v.stock<1?'disabled':''}>${escapeHtml(v.size)} · ${escapeHtml(v.color)} · ${v.stock} ${lang==='ar'?'متوفر':'available'}</option>`).join('')}</select>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin:10px 0 16px">
          <span id="modalVariantSwatch" style="width:34px;height:34px;border-radius:50%;background:${first?.color||p.color};border:2px solid #d7a84e"></span>
          <span>${t('stock')}: <b id="modalVariantStock">${first?.stock||0}</b></span>
        </div>
        <button class="btn gold" style="width:100%" ${!first||first.stock<1?'disabled':''} onclick="addToCart('${p.id}',document.getElementById('modalVariant').value);closeOverlay()">${t('addCart')}</button>
      </div>
    </div>`);
}
function openCart(){
  repairCart();
  const items=cart.map(i=>{
    const p=products.find(x=>x.id===i.id);
    const v=p?getVariant(p,i.variantId):null;
    return p&&v?{...i,p,v}:null;
  }).filter(Boolean);
  const subtotal=items.reduce((s,i)=>s+i.p.price*i.qty,0);
  const total=items.reduce((s,i)=>s+finalPrice(i.p)*i.qty,0);
  showDrawer(`<div class="drawer-head"><h3>${t('cart')}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
    ${items.length?items.map((i,idx)=>`<div class="cart-item">
      <div class="cart-thumb">${productVisual(i.p)}</div>
      <div><b>${escapeHtml(i.p.name)}</b>
        <div class="muted" style="font-size:12px;margin-top:5px">${t('size')}: ${escapeHtml(i.v.size)} · ${t('color')}: ${escapeHtml(i.v.color)}</div>
        <div style="color:#f1cf7f;margin-top:5px">${money(finalPrice(i.p))}</div>
        <div class="qty" style="margin-top:8px"><button onclick="cartQty(${idx},-1)">−</button><b>${i.qty}</b><button onclick="cartQty(${idx},1)">+</button></div>
      </div>
      <button class="iconbtn" onclick="removeCart(${idx})">🗑</button>
    </div>`).join(''):`<div class="empty">${t('emptyCart')}</div>`}
    ${items.length?`<div class="totals">
      <div class="totalrow"><span>${t('subtotal')}</span><span>${money(subtotal)}</span></div>
      <div class="totalrow"><span>${t('discount')}</span><span>− ${money(subtotal-total)}</span></div>
      <div class="totalrow"><span>${t('shipping')}</span><span>${t('free')}</span></div>
      <div class="totalrow big"><span>${t('total')}</span><span>${money(total)}</span></div>
      <button class="btn gold" style="width:100%;margin-top:10px" onclick="checkout()">${t('checkout')}</button>
    </div>`:''}`);
}
function cartQty(idx,d){
  const item=cart[idx];
  if(!item)return;
  const p=products.find(x=>x.id===item.id);
  const v=p?getVariant(p,item.variantId):null;
  if(d>0&&v&&item.qty>=v.stock)return toast(lang==='ar'?`المتوفر لهذا الخيار فقط ${v.stock} قطعة`:`Only ${v.stock} available for this option`);
  item.qty+=d;
  if(item.qty<=0)cart.splice(idx,1);
  saveLocal();
  updateCartBadge();
  openCart();
}
function checkout(){
  if(!currentUser){closeOverlay();openAuth(true);return}
  if(!cart.length)return toast(t('emptyCart'));
  repairCart();
  const items=cart.map(i=>{const p=products.find(x=>x.id===i.id);return p?{...i,name:p.name,price:finalPrice(p)}:null}).filter(Boolean);
  const total=items.reduce((s,i)=>s+i.price*i.qty,0);
  const emirates=['Dubai','Abu Dhabi','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah'];
  showModal(`<div class="modal-head"><h3>${t('checkout')}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
    <div class="notice">🔒 ${lang==='ar'?'طلبك محفوظ ومربوط بحسابك':'Your order is securely linked to your account'}</div>
    <div class="formgrid">
      <div class="field"><label>${t('name')}</label><input id="checkoutName" value="${escapeHtml(currentUser.name||'')}" autocomplete="name"></div>
      <div class="field"><label>${t('mobile')}</label><input id="checkoutMobile" value="${escapeHtml(currentUser.mobile||'')}" inputmode="tel" autocomplete="tel"></div>
      <div class="field"><label>${lang==='ar'?'الإمارة':'Emirate'}</label><select id="checkoutEmirate">${emirates.map(x=>`<option ${x==='Dubai'?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field"><label>${lang==='ar'?'المدينة / المنطقة':'City / Area'}</label><input id="checkoutCity" placeholder="${lang==='ar'?'مثال: البرشاء 1':'e.g. Al Barsha 1'}"></div>
    </div>
    <div class="field"><label>${lang==='ar'?'عنوان التوصيل بالتفصيل':'Delivery address'}</label><textarea id="address" rows="3" placeholder="${lang==='ar'?'اسم الشارع، المبنى، رقم الشقة…':'Street, building, apartment…'}"></textarea></div>
    <div class="field"><label>${lang==='ar'?'ملاحظات الطلب':'Order notes'}</label><textarea id="orderNotes" rows="2" placeholder="${lang==='ar'?'اختياري':'Optional'}"></textarea></div>
    <div class="field"><label>${lang==='ar'?'طريقة الدفع':'Payment method'}</label><select id="paymentMethod">
      <option value="cash_on_delivery">${lang==='ar'?'الدفع عند الاستلام':'Cash on delivery'}</option>
      <option value="bank_transfer">${lang==='ar'?'تحويل بنكي':'Bank transfer'}</option>
      <option value="whatsapp">${lang==='ar'?'تأكيد عبر واتساب':'Confirm via WhatsApp'}</option>
    </select></div>
    <div class="totals"><div class="totalrow big"><span>${t('total')}</span><span>${money(total)}</span></div></div>
    <button id="placeOrderBtn" class="btn gold" style="width:100%" onclick="placeOrder()">${lang==='ar'?'تأكيد الطلب':'Place order'}</button>`);
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
  if(city.length<2)return toast(lang==='ar'?'أدخل المدينة أو المنطقة':'Enter city / area');
  if(address.length<5)return toast(lang==='ar'?'أدخل عنوان التوصيل':'Enter delivery address');
  const btn=document.getElementById('placeOrderBtn');
  if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جارٍ إنشاء الطلب…':'Creating order…'}
  const payload=cart.map(i=>({id:i.id,variant_id:i.variantId,size:i.size,color:i.color,qty:i.qty}));
  const {data,error}=await sb.rpc('place_order_v2',{
    p_items:payload,
    p_customer_name:name,
    p_mobile:mobile,
    p_emirate:emirate,
    p_city:city,
    p_address:address,
    p_notes:notes,
    p_payment_method:payment
  });
  if(error){
    if(btn){btn.disabled=false;btn.textContent=lang==='ar'?'تأكيد الطلب':'Place order'}
    toast(error.message||'Order failed');
    await loadProducts();
    return;
  }
  currentUser={...currentUser,name,mobile};
  const o=data?.[0];
  cart=[];
  saveLocal();
  updateCartBadge();
  await Promise.all([loadProducts(),loadMyOrders()]);
  showModal(`<div class="success"><div class="check">✓</div><h3>${lang==='ar'?'تم استلام طلبك بنجاح':'Order received successfully'}</h3>
    <p>${t('orderNo')}: <b>${escapeHtml(o?.order_no||'SNB')}</b></p>
    <p style="color:#f2cf7b;font-size:22px"><b>${money(o?.total||0)}</b></p>
    <p class="muted">${lang==='ar'?'يمكنك متابعة كل مرحلة من حسابك.':'Track every stage from My Account.'}</p>
    <button class="btn gold" onclick="closeOverlay();renderAccount()">${lang==='ar'?'تتبّع الطلب':'Track order'}</button></div>`);
}
function statusLabel(s){
  const ar={received:'تم استلام الطلب',confirmed:'تم التأكيد',preparing:'قيد التجهيز',shipped:'تم الشحن',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي'};
  const en={received:'Order received',confirmed:'Confirmed',preparing:'Preparing',shipped:'Shipped',out_for_delivery:'Out for delivery',delivered:'Delivered',cancelled:'Cancelled'};
  return lang==='ar'?(ar[s]||s):(en[s]||String(s||'').replaceAll('_',' '));
}
function orderProgressHtml(status){
  if(status==='cancelled')return `<div class="notice" style="border-color:rgba(209,96,96,.4);color:#ffb0b0">✕ ${statusLabel(status)}</div>`;
  const steps=['received','confirmed','preparing','shipped','out_for_delivery','delivered'];
  const current=Math.max(0,steps.indexOf(status));
  return `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:12px 0">${steps.map((s,i)=>`<div style="text-align:center;min-width:0"><div style="height:6px;border-radius:999px;background:${i<=current?'linear-gradient(90deg,#d7a84e,#f4d487)':'rgba(255,255,255,.12)'}"></div><small style="display:block;margin-top:5px;color:${i<=current?'#f2d283':'#7f7668'};font-size:9px">${escapeHtml(statusLabel(s))}</small></div>`).join('')}</div>`;
}
function accountOrdersHtml(){
  return myOrders.length?myOrders.map((o,idx)=>`<div style="border:1px solid var(--line);border-radius:16px;padding:13px;margin-bottom:11px">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${escapeHtml(o.order_no)}</b><span class="status ${o.status==='cancelled'?'warn':'ok'}">${escapeHtml(statusLabel(o.status))}</span></div>
    ${orderProgressHtml(o.status)}
    <div class="muted" style="font-size:12px">${new Date(o.created_at).toLocaleString()}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px"><b style="color:#f2cf7b">${money(o.total)}</b><button class="btn small" onclick="openOrderDetails(${idx})">${lang==='ar'?'التفاصيل':'Details'}</button></div>
  </div>`).join(''):`<div class="empty">${lang==='ar'?'لا توجد طلبات بعد':'No orders yet'}</div>`;
}
async function loadMyOrders(){
  if(!currentUser){myOrders=[];return}
  const {data,error}=await sb.from('orders')
    .select('order_no,total,status,payment_method,address,emirate,city,notes,tracking_number,tracking_carrier,created_at,order_items(product_name,size,color,qty,unit_price,image_url,variant_id)')
    .eq('user_id',currentUser.id)
    .order('created_at',{ascending:false});
  if(!error)myOrders=data||[];
}
function openOrderDetails(index){
  const o=myOrders[index];
  if(!o)return;
  showModal(`<div class="modal-head"><h3>${escapeHtml(o.order_no)}</h3><button class="iconbtn close" onclick="renderAccount()">✕</button></div>
    ${orderProgressHtml(o.status)}
    <div class="notice"><b>${statusLabel(o.status)}</b><br><small>${new Date(o.created_at).toLocaleString()}</small></div>
    <div style="display:grid;gap:10px">${(o.order_items||[]).map(i=>`<div style="display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:10px">
      <div class="cart-thumb" style="width:64px">${i.image_url?`<img src="${escapeHtml(i.image_url)}" alt="">`:'◇'}</div>
      <div><b>${escapeHtml(i.product_name)}</b><div class="muted" style="font-size:12px">${escapeHtml(i.size||'')} · ${escapeHtml(i.color||'')}</div><small>${lang==='ar'?'الكمية':'Qty'}: ${i.qty}</small></div>
      <b>${money(Number(i.unit_price||0)*Number(i.qty||0))}</b>
    </div>`).join('')}</div>
    <div class="notice" style="margin-top:14px">${escapeHtml([o.emirate,o.city,o.address].filter(Boolean).join(' · '))}${o.notes?`<br><small>${escapeHtml(o.notes)}</small>`:''}</div>
    ${o.tracking_number?`<div class="notice">🚚 ${lang==='ar'?'رقم التتبع':'Tracking'}: <b>${escapeHtml(o.tracking_number)}</b>${o.tracking_carrier?` · ${escapeHtml(o.tracking_carrier)}`:''}</div>`:''}
    <div class="totalrow big"><span>${t('total')}</span><span>${money(o.total)}</span></div>`);
}
async function renderAccount(){
  if(!currentUser)return renderAuth('login');
  await loadMyOrders();
  showModal(`<div class="modal-head"><h3>${accountLabel()}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
    <div class="success" style="padding:8px 4px 14px"><div class="check">✓</div><h3 style="margin:8px 0">${escapeHtml(currentUser.name||signedInLabel())}</h3>
      <div class="notice" style="margin:12px 0"><b>${escapeHtml(currentUser.email||'')}</b>${currentUser.mobile?`<br><small>${escapeHtml(currentUser.mobile)}</small>`:''}</div>
    </div>
    <h4 style="margin:8px 0 10px">${lang==='ar'?'طلباتي':'My Orders'}</h4>
    <div id="accountOrders">${accountOrdersHtml()}</div>
    <button class="btn ghost" style="width:100%;margin-top:12px" onclick="logoutCustomer()">${t('logout')}</button>`);
}
async function subscribeOrderUpdates(){
  if(orderStatusChannel){try{await sb.removeChannel(orderStatusChannel)}catch(e){} orderStatusChannel=null}
  if(!currentUser)return;
  orderStatusChannel=sb.channel('snb-orders-'+currentUser.id)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:`user_id=eq.${currentUser.id}`},async payload=>{
      await loadMyOrders();
      const box=document.getElementById('accountOrders');
      if(box)box.innerHTML=accountOrdersHtml();
      toast(lang==='ar'?`تحديث الطلب: ${statusLabel(payload.new?.status)}`:`Order update: ${statusLabel(payload.new?.status)}`);
    })
    .subscribe();
}
async function setSignedInCustomer(u,notify=false){
  if(!u)return;
  const {data}=await sb.from('customers').select('id,email,name,mobile,created_at,confirmed_at').eq('id',u.id).maybeSingle();
  currentUser={id:u.id,name:data?.name||u.user_metadata?.name||u.email?.split('@')[0]||'SNB Customer',email:data?.email||u.email||'',mobile:data?.mobile||u.user_metadata?.mobile||'',created:data?.created_at||u.created_at||''};
  updateAuthUI();
  await Promise.all([loadWishlist(),loadMyOrders(),checkAdmin()]);
  await subscribeOrderUpdates();
  if(notify)showAuthWelcome();
  if(localStorage.getItem('snb_pending_checkout')==='1'){localStorage.removeItem('snb_pending_checkout');setTimeout(checkout,250)}
}
async function logoutCustomer(){
  if(orderStatusChannel){try{await sb.removeChannel(orderStatusChannel)}catch(e){} orderStatusChannel=null}
  const {error}=await sb.auth.signOut();
  if(error)return toast(error.message||'Could not sign out');
  currentUser=null;wishlist=new Set();myOrders=[];isAdmin=false;
  updateAuthUI();renderProducts();closeOverlay();
  toast(lang==='ar'?'تم تسجيل الخروج بنجاح':'Signed out successfully');
}
async function loadAdminData(){
  const [pd,od,cu]=await Promise.all([
    sb.from('products').select('*,product_variants(*)').order('created_at',{ascending:false}),
    sb.from('orders').select('*,order_items(*)').order('created_at',{ascending:false}),
    sb.from('customers').select('*').order('created_at',{ascending:false})
  ]);
  if(pd.error)throw pd.error;if(od.error)throw od.error;if(cu.error)throw cu.error;
  products=(pd.data||[]).map(normalizeProduct);
  orders=(od.data||[]).map(o=>({...o,customer:o.customer_name,date:new Date(o.created_at).toLocaleString(),items:o.order_items||[]}));
  customers=(cu.data||[]).map(c=>({...c,created:new Date(c.created_at).toLocaleString()}));
}
function variantRowHtml(v={}){
  const safeColor=/^#[0-9a-f]{6}$/i.test(v.color||'')?v.color:'#111111';
  return `<div class="variant-row" data-id="${escapeHtml(v.id||'')}" style="display:grid;grid-template-columns:1.2fr .8fr .8fr auto;gap:8px;align-items:end;margin-bottom:8px">
    <div class="field" style="margin:0"><label>${t('size')}</label><input class="variant-size" value="${escapeHtml(v.size||'One Size')}"></div>
    <div class="field" style="margin:0"><label>${t('color')}</label><input class="variant-color" type="color" value="${safeColor}"></div>
    <div class="field" style="margin:0"><label>${t('stock')}</label><input class="variant-stock" type="number" min="0" value="${Number(v.stock||0)}" oninput="refreshVariantStock()"></div>
    <button type="button" class="btn danger small" onclick="this.closest('.variant-row').remove();refreshVariantStock()">✕</button>
  </div>`;
}
function refreshVariantStock(){
  const total=[...document.querySelectorAll('.variant-stock')].reduce((s,e)=>s+Math.max(0,Number(e.value||0)),0);
  const el=document.getElementById('variantStockTotal');
  if(el)el.textContent=String(total);
}
function addVariantRow(size='One Size',color='#111111',stock=0){
  document.getElementById('variantRows')?.insertAdjacentHTML('beforeend',variantRowHtml({size,color,stock}));
  refreshVariantStock();
}
function editProduct(id=''){
  const p=id?products.find(x=>x.id===id):{id:'p'+Date.now(),name:'',category:'shoes',price:0,discount:0,stock:0,color:'#111111',type:'shoe',sizes:['40'],active:true,image_url:'',variants:[]};
  const image=p.image_url||p.image||'';
  const variants=p.variants?.length?p.variants:[{size:p.sizes?.[0]||'One Size',color:p.color||'#111111',stock:Number(p.stock||0)}];
  showModal(`<div class="modal-head"><h3>${id?t('edit'):t('addProduct')}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
    <div class="field"><label>${lang==='ar'?'صورة المنتج':'Product photo'}</label>
      ${image?`<img id="pImagePreview" class="image-preview" src="${escapeHtml(image)}" alt="">`:`<img id="pImagePreview" class="image-preview hidden" alt="">`}
      <input id="pImage" type="file" accept="image/jpeg,image/png,image/webp" onchange="previewProductImage(this)">
      <small class="muted">${lang==='ar'?'اختر صورة من الموبايل. سيتم ضغطها ورفعها للسحابة تلقائياً.':'Choose a photo. It will be compressed and uploaded to the cloud.'}</small>
    </div>
    <div class="formgrid">
      <div class="field"><label>${t('productName')}</label><input id="pName" value="${escapeHtml(p.name)}"></div>
      <div class="field"><label>${t('category')}</label><select id="pCat"><option value="shoes" ${p.category==='shoes'?'selected':''}>${t('shoes')}</option><option value="bags" ${p.category==='bags'?'selected':''}>${t('bags')}</option><option value="wallets" ${p.category==='wallets'?'selected':''}>${t('wallets')}</option></select></div>
      <div class="field"><label>${t('price')} AED</label><input id="pPrice" type="number" min="0" step="0.01" value="${p.price}"></div>
      <div class="field"><label>${t('discount')} %</label><input id="pDiscount" type="number" min="0" max="90" value="${p.discount}"></div>
      <div class="field"><label>${t('status')}</label><select id="pActive"><option value="1" ${p.active?'selected':''}>${t('active')}</option><option value="0" ${!p.active?'selected':''}>${t('inactive')}</option></select></div>
    </div>
    <div class="notice"><b>${lang==='ar'?'المقاسات / الألوان / المخزون':'Sizes / colors / stock'}</b><br><small>${lang==='ar'?'كل سطر خيار مستقل ومخزونه مستقل.':'Each row is a separate option with its own stock.'}</small></div>
    <div id="variantRows">${variants.map(variantRowHtml).join('')}</div>
    <div style="display:flex;gap:8px;align-items:center;margin:10px 0 14px"><button type="button" class="btn small" onclick="addVariantRow()">＋ ${lang==='ar'?'إضافة خيار':'Add option'}</button><span class="muted">${lang==='ar'?'إجمالي المخزون':'Total stock'}: <b id="variantStockTotal">${variants.reduce((s,v)=>s+Number(v.stock||0),0)}</b></span></div>
    <button id="saveProductBtn" class="btn gold" style="width:100%" onclick="saveProduct('${p.id}',${id?1:0})">${t('save')}</button>`);
}
async function saveProduct(id,exists){
  const name=document.getElementById('pName')?.value.trim()||'';
  const cat=document.getElementById('pCat')?.value||'shoes';
  const price=Number(document.getElementById('pPrice')?.value||0);
  const discount=Number(document.getElementById('pDiscount')?.value||0);
  const rows=[...document.querySelectorAll('.variant-row')];
  const variants=rows.map(row=>({
    id:row.dataset.id||'',
    size:row.querySelector('.variant-size')?.value.trim()||'One Size',
    color:row.querySelector('.variant-color')?.value||'#111111',
    stock:Math.max(0,Number(row.querySelector('.variant-stock')?.value||0))
  }));
  if(!name||price<0||discount<0||discount>90||!variants.length)return toast(lang==='ar'?'تحقق من بيانات المنتج':'Check product data');
  const keys=variants.map(v=>`${v.size.toLowerCase()}|${v.color.toLowerCase()}`);
  if(new Set(keys).size!==keys.length)return toast(lang==='ar'?'يوجد خيار مقاس/لون مكرر':'Duplicate size/color option');
  const stock=variants.reduce((s,v)=>s+v.stock,0);
  const sizes=[...new Set(variants.map(v=>v.size))];
  const old=exists?products.find(x=>x.id===id):null;
  let image_url=old?.image_url||old?.image||null;
  const file=document.getElementById('pImage')?.files?.[0];
  const btn=document.getElementById('saveProductBtn');
  if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جارٍ الحفظ…':'Saving…'}
  if(file){
    try{
      const blob=await compressProductImageBlob(file);
      const path=`${id}/${Date.now()}.webp`;
      const up=await sb.storage.from('product-images').upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:false});
      if(up.error)throw up.error;
      image_url=sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }catch(e){
      if(btn){btn.disabled=false;btn.textContent=t('save')}
      return toast(e.message||'Image upload failed');
    }
  }
  const obj={id,name,category:cat,price,discount,stock,color:variants[0].color,type:cat==='bags'?'bag':cat==='wallets'?'wallet':'shoe',sizes,active:document.getElementById('pActive')?.value==='1',image_url,updated_at:new Date().toISOString()};
  const q=exists?sb.from('products').update(obj).eq('id',id):sb.from('products').insert(obj);
  const {error}=await q;
  if(error){
    if(btn){btn.disabled=false;btn.textContent=t('save')}
    return toast(error.message||'Could not save product');
  }
  try{
    const oldIds=(old?.variants||[]).map(v=>v.id).filter(Boolean);
    const keepIds=variants.map(v=>v.id).filter(Boolean);
    const removed=oldIds.filter(x=>!keepIds.includes(x));
    if(removed.length){
      const del=await sb.from('product_variants').delete().eq('product_id',id).in('id',removed);
      if(del.error)throw del.error;
    }
    for(const v of variants){
      if(v.id){
        const upd=await sb.from('product_variants').update({size:v.size,color:v.color,stock:v.stock,updated_at:new Date().toISOString()}).eq('id,v.id).eq('product_id',id);
        if(upd.error)throw upd.error;
      }else{
        const ins=await sb.from('product_variants').insert({product_id:id,size:v.size,color:v.color,stock:v.stock});
        if(ins.error)throw ins.error;
      }
    }
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent=t('save')}
    return toast(e.message||'Could not save product options');
  }
  closeOverlay();
  await loadAdminData();
  renderAdminReplace('products');
}
// ===== End SNB Commerce Upgrade =====
