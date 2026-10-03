
(function(){
  var v13Search='';
  var v13SortMode='newest';
  var v13FilterSize='';
  var v13FilterColor='';
  var v13MaxPrice=0;
  var v13Addresses=[];
  var v13ShippingRules=[];
  var v13Coupon={code:'',discount:0,message:''};
  var v13ModalSelection={productId:'',size:'',color:'',variantId:''};
  var v13AdminOrderChannel=null;

  function v13Css(){
    if(document.getElementById('v13css'))return;
    var s=document.createElement('style');
    s.id='v13css';
    s.textContent=`
    .snb-badges{position:absolute;top:10px;left:10px;z-index:5;display:grid;gap:5px;pointer-events:none}.snb-tag{display:inline-block;width:max-content;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;letter-spacing:.04em;background:#111;color:#f4d487;border:1px solid rgba(244,212,135,.45);box-shadow:0 5px 16px rgba(0,0,0,.25)}.snb-tag.new{background:linear-gradient(135deg,#f2d283,#b87824);color:#161007}.snb-tag.low{background:#7b2020;color:#fff;border-color:#b83a3a}.snb-tag.best{background:#17110b;color:#f4d487}.store-tools{display:grid;grid-template-columns:1.3fr repeat(4,minmax(130px,.6fr));gap:8px;margin:8px 0 12px}.store-tools select,.store-tools input{background:#0b0907;color:#fff;border:1px solid var(--line);border-radius:12px;padding:10px}.size-pills,.color-pills{display:flex;gap:8px;flex-wrap:wrap}.size-pill{min-width:48px}.size-pill.active{background:linear-gradient(135deg,#f2d283,#b87824);color:#161007;font-weight:900}.size-pill:disabled{opacity:.3}.color-dot{width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,.25);box-shadow:inset 0 0 0 3px #0b0907;cursor:pointer}.color-dot.active{outline:3px solid #f1ce78;outline-offset:2px}.gallery-main{width:100%;aspect-ratio:4/5;background:#090705;border:1px solid var(--line);border-radius:18px;display:grid;place-items:center;overflow:hidden}.gallery-main img{width:100%;height:100%;object-fit:contain}.gallery-thumbs{display:flex;gap:7px;overflow:auto;margin-top:8px}.gallery-thumb{width:62px;min-width:62px;aspect-ratio:4/5;border:1px solid var(--line);border-radius:10px;background:#090705;padding:2px;cursor:pointer}.gallery-thumb img{width:100%;height:100%;object-fit:contain}.gallery-thumb.active{border-color:#f2d283}.timeline{display:grid;gap:7px;margin:14px 0}.timeline-row{display:grid;grid-template-columns:18px 1fr auto;gap:10px;align-items:center}.timeline-dot{width:12px;height:12px;border-radius:50%;background:#333;border:2px solid #5e564b}.timeline-row.done .timeline-dot{background:#d7a84e;border-color:#f4d487;box-shadow:0 0 12px rgba(215,168,78,.35)}.timeline-time{font-size:10px;color:var(--muted);white-space:nowrap}.addr-card{border:1px solid var(--line);border-radius:14px;padding:11px;margin:8px 0;display:flex;gap:10px;align-items:flex-start}.admin-alert{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:#b52626;color:#fff;font-weight:900;font-size:12px}.stock-low{color:#ffadad}.splash-v13{position:fixed;inset:0;z-index:999;background:radial-gradient(circle at 50% 45%,#2a1c0b 0,#090705 42%,#050403 100%);display:grid;place-items:center;transition:opacity .5s ease}.splash-v13.hide{opacity:0;pointer-events:none}.splash-v13-inner{text-align:center}.splash-v13 img{width:116px;height:116px;border-radius:30px;box-shadow:0 0 70px rgba(215,168,78,.28);animation:snbPulse 1.5s ease-in-out infinite}.splash-v13 b{display:block;color:#f4d487;font-family:Georgia,serif;letter-spacing:.18em;font-size:22px;margin-top:16px}.splash-v13 small{color:#a99879;letter-spacing:.22em}@keyframes snbPulse{50%{transform:scale(1.045);filter:brightness(1.12)}}.image-strip{display:flex;gap:8px;overflow:auto}.image-chip{position:relative;width:78px;min-width:78px;aspect-ratio:4/5;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#090705}.image-chip img{width:100%;height:100%;object-fit:contain}.image-chip button{position:absolute;top:3px;right:3px;width:24px;height:24px;border-radius:50%;border:0;background:#7b2020;color:#fff;cursor:pointer}
    @media(max-width:850px){.store-tools{grid-template-columns:1fr 1fr}.store-tools .searchwide{grid-column:1/-1}}@media(max-width:520px){.store-tools{grid-template-columns:1fr 1fr}.store-tools select,.store-tools input{min-width:0}.timeline-row{grid-template-columns:16px 1fr}.timeline-time{grid-column:2}.variant-row-v13{grid-template-columns:1fr 1fr!important}}
    `;
    document.head.appendChild(s);
  }

  function v13Splash(){
    if(sessionStorage.getItem('snb_splash_seen'))return;
    sessionStorage.setItem('snb_splash_seen','1');
    var d=document.createElement('div');
    d.className='splash-v13';
    d.id='splashV13';
    d.innerHTML='<div class="splash-v13-inner"><img src="assets/SNB-App-Icon.png" alt="SNB"><b>SNB</b><small>LEATHER GOODS</small></div>';
    document.body.appendChild(d);
    setTimeout(function(){d.classList.add('hide');setTimeout(function(){d.remove()},550)},1100);
  }

  function v13ProductImages(p){
    var arr=[];
    (Array.isArray(p.product_images)?p.product_images:[]).slice().sort(function(a,b){return Number(a.sort_order||0)-Number(b.sort_order||0)}).forEach(function(x){if(x.image_url&&!arr.includes(x.image_url))arr.push(x.image_url)});
    var main=p.image_url||p.image||'';
    if(main&&!arr.includes(main))arr.unshift(main);
    return arr;
  }

  window.normalizeProduct=function(p){
    var variants=(Array.isArray(p.product_variants)?p.product_variants:Array.isArray(p.variants)?p.variants:[]).map(function(v){return {...v,stock:Number(v.stock||0)}});
    variants.sort(function(a,b){return String(a.size).localeCompare(String(b.size),undefined,{numeric:true})||String(a.color_name||a.color||'').localeCompare(String(b.color_name||b.color||''))});
    var fallbackSizes=Array.isArray(p.sizes)?p.sizes:String(p.sizes||'One Size').split(',').map(function(s){return s.trim()}).filter(Boolean);
    var sizes=variants.length?[...new Set(variants.map(function(v){return v.size||'One Size'}))]:fallbackSizes;
    var variantStock=variants.length?variants.reduce(function(s,v){return s+Number(v.stock||0)},0):Number(p.stock||0);
    return {...p,price:Number(p.price||0),discount:Number(p.discount||0),stock:variantStock,sizes:sizes,variants:variants,images:v13ProductImages(p),image:p.image_url||p.image||''};
  };

  window.loadProducts=async function(){
    var q=await sb.from('products').select('*,product_variants(*),product_images(*)').order('created_at',{ascending:false});
    if(q.error){console.error(q.error);return false}
    products=(q.data||[]).map(normalizeProduct);
    if(typeof repairCart==='function')repairCart();
    renderProducts();
    v13RefreshFilterOptions();
    return true;
  };

  function v13EnsureStoreTools(){
    if(document.getElementById('v13StoreTools'))return;
    var old=document.getElementById('productSearch');
    if(old)old.closest('.field')?.classList.add('hidden');
    var filters=document.getElementById('filters');
    if(!filters)return;
    var wrap=document.createElement('div');
    wrap.id='v13StoreTools';
    wrap.className='store-tools';
    wrap.innerHTML='<input class="searchwide" id="v13Search" type="search" placeholder="ابحث / Search" oninput="setSearch(this.value)"><select id="v13Sort" onchange="v13SetSort(this.value)"><option value="newest">الأحدث / Newest</option><option value="price_low">السعر: الأقل / Price low</option><option value="price_high">السعر: الأعلى / Price high</option><option value="bestseller">الأكثر مبيعاً / Best seller</option></select><select id="v13Size" onchange="v13SetSize(this.value)"><option value="">كل المقاسات / All sizes</option></select><select id="v13Color" onchange="v13SetColor(this.value)"><option value="">كل الألوان / All colors</option></select><input id="v13MaxPrice" type="number" min="0" placeholder="Max AED" oninput="v13SetMaxPrice(this.value)">';
    filters.parentNode.insertBefore(wrap,filters);
    v13RefreshFilterOptions();
  }

  function v13RefreshFilterOptions(){
    var size=document.getElementById('v13Size'),color=document.getElementById('v13Color');
    if(size){
      var sizes=[...new Set(products.flatMap(function(p){return (p.variants||[]).map(function(v){return v.size})}).filter(Boolean))].sort(function(a,b){return String(a).localeCompare(String(b),undefined,{numeric:true})});
      var cur=size.value;
      size.innerHTML='<option value="">كل المقاسات / All sizes</option>'+sizes.map(function(x){return '<option value="'+escapeHtml(x)+'">'+escapeHtml(x)+'</option>'}).join('');
      if(sizes.includes(cur))size.value=cur;
    }
    if(color){
      var colors=[];
      products.forEach(function(p){(p.variants||[]).forEach(function(v){var key=v.color||'';if(key&&!colors.some(function(x){return x.key===key}))colors.push({key:key,name:v.color_name||key})})});
      var ccur=color.value;
      color.innerHTML='<option value="">كل الألوان / All colors</option>'+colors.map(function(x){return '<option value="'+escapeHtml(x.key)+'">'+escapeHtml(x.name)+'</option>'}).join('');
      if(colors.some(function(x){return x.key===ccur}))color.value=ccur;
    }
  }

  window.setSearch=function(v){v13Search=String(v||'').trim().toLowerCase();renderProducts()};
  window.v13SetSort=function(v){v13SortMode=v;renderProducts()};
  window.v13SetSize=function(v){v13FilterSize=v;renderProducts()};
  window.v13SetColor=function(v){v13FilterColor=v;renderProducts()};
  window.v13SetMaxPrice=function(v){v13MaxPrice=Math.max(0,Number(v||0));renderProducts()};

  window.renderProducts=function(){
    var list=products.filter(function(p){
      if(!p.active)return false;
      if(category!=='all'&&p.category!==category)return false;
      if(wishlistOnly&&!wishlist.has(p.id))return false;
      if(v13Search&&!String(p.name||'').toLowerCase().includes(v13Search)&&!String(p.category||'').toLowerCase().includes(v13Search))return false;
      if(v13FilterSize&&!(p.variants||[]).some(function(v){return v.size===v13FilterSize&&v.stock>0}))return false;
      if(v13FilterColor&&!(p.variants||[]).some(function(v){return v.color===v13FilterColor&&v.stock>0}))return false;
      if(v13MaxPrice>0&&finalPrice(p)>v13MaxPrice)return false;
      return true;
    });
    list.sort(function(a,b){
      if(v13SortMode==='price_low')return finalPrice(a)-finalPrice(b);
      if(v13SortMode==='price_high')return finalPrice(b)-finalPrice(a);
      if(v13SortMode==='bestseller')return Number(b.is_best_seller)-Number(a.is_best_seller)||String(b.created_at||'').localeCompare(String(a.created_at||''));
      return String(b.created_at||'').localeCompare(String(a.created_at||''));
    });
    var grid=document.getElementById('productGrid');
    if(!grid)return;
    grid.innerHTML=list.map(function(p){
      var low=p.stock>0&&p.stock<=Number(p.low_stock_threshold??2);
      var tags='';
      if(p.is_new)tags+='<span class="snb-tag new">NEW</span>';
      if(p.is_best_seller)tags+='<span class="snb-tag best">BEST SELLER</span>';
      if(low)tags+='<span class="snb-tag low">LOW STOCK</span>';
      return '<article class="product">'+(tags?'<div class="snb-badges">'+tags+'</div>':'')+(p.discount?'<div class="sale">-'+p.discount+'%</div>':'')+'<button aria-label="Wishlist" onclick="toggleWishlist(event,\''+p.id+'\')" style="position:absolute;top:10px;right:10px;z-index:6;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:rgba(8,7,5,.86);color:'+(wishlist.has(p.id)?'#f3d58c':'#fff')+';font-size:20px;cursor:pointer">'+(wishlist.has(p.id)?'♥':'♡')+'</button><div class="product-media" onclick="viewProduct(\''+p.id+'\')">'+productVisual(p)+'</div><div class="product-body"><h4>'+escapeHtml(p.name)+'</h4><div class="price"><strong>'+money(finalPrice(p))+'</strong>'+(p.discount?'<span class="old">'+money(p.price)+'</span>':'')+'</div><div class="meta"><span>'+t('stock')+': '+p.stock+'</span><span>'+t(p.category)+'</span></div><div class="product-actions"><button class="btn gold small" '+(p.stock<1?'disabled':'')+' onclick="addToCart(\''+p.id+'\')">'+(p.stock<1?(lang==='ar'?'نفد المخزون':'Out of stock'):t('addCart'))+'</button><button class="btn small" onclick="viewProduct(\''+p.id+'\')">⌕</button></div></div></article>';
    }).join('')||'<div class="empty" style="grid-column:1/-1">'+(lang==='ar'?'لا توجد نتائج':'No results')+'</div>';
  };

  function v13SelectedVariant(p){
    return (p.variants||[]).find(function(v){return v.id===v13ModalSelection.variantId})||null;
  }

  function v13RenderVariantOptions(p){
    var host=document.getElementById('v13VariantOptions');
    if(!host)return;
    var sizes=[...new Set((p.variants||[]).map(function(v){return v.size}))];
    var colors=(p.variants||[]).filter(function(v){return v.size===v13ModalSelection.size});
    host.innerHTML='<div class="field"><label>'+t('size')+'</label><div class="size-pills">'+sizes.map(function(s){var has=(p.variants||[]).some(function(v){return v.size===s&&v.stock>0});return '<button class="btn size-pill '+(s===v13ModalSelection.size?'active':'')+'" '+(has?'':'disabled')+' onclick="v13ChooseSize(\''+p.id+'\',\''+escapeHtml(s)+'\')">'+escapeHtml(s)+'</button>'}).join('')+'</div></div><div class="field"><label>'+t('color')+'</label><div class="color-pills">'+colors.map(function(v){return '<button title="'+escapeHtml(v.color_name||v.color)+'" class="color-dot '+(v.id===v13ModalSelection.variantId?'active':'')+'" style="background:'+escapeHtml(v.color)+'" '+(v.stock>0?'':'disabled')+' onclick="v13ChooseColor(\''+p.id+'\',\''+v.id+'\')"></button>'}).join('')+'</div></div><div class="notice">'+(lang==='ar'?'المتوفر من هذا الخيار: ':'Available for this option: ')+'<b>'+(v13SelectedVariant(p)?.stock||0)+'</b></div>';
  }

  window.v13ChooseSize=function(id,size){
    var p=products.find(function(x){return x.id===id});if(!p)return;
    var v=(p.variants||[]).find(function(x){return x.size===size&&x.stock>0})||(p.variants||[]).find(function(x){return x.size===size});
    if(!v)return;
    v13ModalSelection={productId:id,size:size,color:v.color,variantId:v.id};
    v13RenderVariantOptions(p);
  };
  window.v13ChooseColor=function(id,variantId){
    var p=products.find(function(x){return x.id===id});if(!p)return;
    var v=(p.variants||[]).find(function(x){return x.id===variantId});if(!v||v.stock<1)return;
    v13ModalSelection={productId:id,size:v.size,color:v.color,variantId:v.id};
    v13RenderVariantOptions(p);
  };
  window.v13SetGalleryImage=function(url,index){
    var im=document.getElementById('v13MainImage');if(im)im.src=url;
    document.querySelectorAll('.gallery-thumb').forEach(function(x,i){x.classList.toggle('active',i===index)});
  };

  window.viewProduct=function(id){
    var p=products.find(function(x){return x.id===id});if(!p)return;
    var first=(p.variants||[]).find(function(v){return v.stock>0})||(p.variants||[])[0];
    if(first)v13ModalSelection={productId:id,size:first.size,color:first.color,variantId:first.id};
    var imgs=v13ProductImages(p);
    var visual=imgs.length?'<div class="gallery-main"><img id="v13MainImage" src="'+escapeHtml(imgs[0])+'" alt="'+escapeHtml(p.name)+'"></div><div class="gallery-thumbs">'+imgs.map(function(u,i){return '<button class="gallery-thumb '+(i===0?'active':'')+'" onclick="v13SetGalleryImage(\''+escapeHtml(u)+'\','+i+')"><img src="'+escapeHtml(u)+'" alt=""></button>'}).join('')+'</div>':'<div class="product-media product-detail-media">'+productVisual(p)+'</div>';
    showModal('<div class="modal-head"><h3>'+escapeHtml(p.name)+'</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="productdetail"><div>'+visual+'</div><div><div class="price"><strong style="font-size:25px">'+money(finalPrice(p))+'</strong>'+(p.discount?'<span class="old">'+money(p.price)+'</span>':'')+'</div><p class="muted">SNB Leather Goods · SUBSTANCE • NUANCE • BRILLIANCE</p><div id="v13VariantOptions"></div><button class="btn gold" style="width:100%" '+(!first||first.stock<1?'disabled':'')+' onclick="addToCart(\''+p.id+'\',v13ModalSelection.variantId);closeOverlay()">'+t('addCart')+'</button></div></div>');
    v13RenderVariantOptions(p);
  };

  async function v13LoadCheckoutData(){
    var a=await sb.from('customer_addresses').select('*').eq('user_id',currentUser.id).order('is_default',{ascending:false}).order('created_at',{ascending:false});
    v13Addresses=a.error?[]:(a.data||[]);
    var s=await sb.from('shipping_rules').select('*').eq('active',true);
    v13ShippingRules=s.error?[]:(s.data||[]);
  }

  function v13CartMerchTotal(){
    return cart.reduce(function(sum,i){var p=products.find(function(x){return x.id===i.id});return sum+(p?finalPrice(p)*Number(i.qty||0):0)},0);
  }
  function v13ShippingFee(emirate,net){
    var r=v13ShippingRules.find(function(x){return x.emirate===emirate});
    if(!r)return 0;
    var free=Number(r.free_over||0);
    return free===0||Number(net)>=free?0:Number(r.fee||0);
  }
  function v13UpdateCheckoutSummary(){
    var merch=v13CartMerchTotal();
    var coupon=Math.min(Number(v13Coupon.discount||0),merch);
    var emirate=document.getElementById('checkoutEmirate')?.value||'Dubai';
    var ship=v13ShippingFee(emirate,Math.max(merch-coupon,0));
    var total=Math.max(merch-coupon+ship,0);
    var ce=document.getElementById('v13CouponDiscount'),se=document.getElementById('v13ShippingFee'),te=document.getElementById('v13CheckoutTotal');
    if(ce)ce.textContent='− '+money(coupon);
    if(se)se.textContent=ship?money(ship):t('free');
    if(te)te.textContent=money(total);
  }
  window.v13ApplyCoupon=async function(){
    var code=document.getElementById('couponCode')?.value.trim().toUpperCase()||'';
    if(!code){v13Coupon={code:'',discount:0,message:''};v13UpdateCheckoutSummary();return toast(lang==='ar'?'أدخل كود الخصم':'Enter coupon code')}
    var r=await sb.rpc('validate_coupon',{p_code:code,p_amount:v13CartMerchTotal()});
    if(r.error)return toast(r.error.message||'Coupon error');
    var x=r.data?.[0];
    if(!x?.valid){v13Coupon={code:'',discount:0,message:x?.message||''};v13UpdateCheckoutSummary();return toast(x?.message||'Invalid coupon')}
    v13Coupon={code:code,discount:Number(x.discount||0),message:x.message||''};
    v13UpdateCheckoutSummary();
    toast(lang==='ar'?'تم تطبيق الكوبون ✓':'Coupon applied ✓');
  };
  window.v13UseSavedAddress=function(id){
    var a=v13Addresses.find(function(x){return x.id===id});if(!a)return;
    var e=document.getElementById('checkoutEmirate'),c=document.getElementById('checkoutCity'),ad=document.getElementById('address');
    if(e)e.value=a.emirate;if(c)c.value=a.city;if(ad)ad.value=a.address;
    v13UpdateCheckoutSummary();
  };
  window.v13UseLastOrder=function(){
    var o=myOrders?.[0];if(!o)return;
    var e=document.getElementById('checkoutEmirate'),c=document.getElementById('checkoutCity'),ad=document.getElementById('address');
    if(e&&o.emirate)e.value=o.emirate;if(c)c.value=o.city||'';if(ad)ad.value=o.address||'';
    v13UpdateCheckoutSummary();
  };

  window.checkout=async function(){
    if(!currentUser){closeOverlay();localStorage.setItem('snb_pending_checkout','1');openAuth(true);return}
    if(!cart.length)return toast(t('emptyCart'));
    if(typeof repairCart==='function')repairCart();
    await v13LoadCheckoutData();
    v13Coupon={code:'',discount:0,message:''};
    var emirates=['Dubai','Abu Dhabi','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah'];
    var def=v13Addresses.find(function(x){return x.is_default})||v13Addresses[0]||null;
    var defEm=def?.emirate||currentUser.default_emirate||'Dubai';
    var defCity=def?.city||currentUser.default_city||'';
    var defAddr=def?.address||currentUser.default_address||'';
    showModal('<div class="modal-head"><h3>'+t('checkout')+'</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div class="notice">🔒 '+(lang==='ar'?'الطلب والمخزون يتم التحقق منهما من السيرفر قبل التأكيد.':'Order and stock are verified by the server before confirmation.')+'</div>'+(v13Addresses.length?'<div class="field"><label>'+(lang==='ar'?'العناوين المحفوظة':'Saved addresses')+'</label><select onchange="if(this.value)v13UseSavedAddress(this.value)"><option value="">—</option>'+v13Addresses.map(function(a){return '<option value="'+a.id+'">'+escapeHtml(a.label)+' · '+escapeHtml(a.emirate)+' · '+escapeHtml(a.city)+'</option>'}).join('')+'</select></div>':'')+(myOrders?.length?'<button class="btn small" style="margin-bottom:10px" onclick="v13UseLastOrder()">'+(lang==='ar'?'استخدم عنوان آخر طلب':'Use last order address')+'</button>':'')+'<div class="formgrid"><div class="field"><label>'+t('name')+'</label><input id="checkoutName" value="'+escapeHtml(currentUser.name||'')+'"></div><div class="field"><label>'+t('mobile')+'</label><input id="checkoutMobile" value="'+escapeHtml(currentUser.mobile||'')+'" inputmode="tel"></div><div class="field"><label>'+(lang==='ar'?'الإمارة':'Emirate')+'</label><select id="checkoutEmirate" onchange="v13UpdateCheckoutSummary()">'+emirates.map(function(x){return '<option value="'+x+'" '+(x===defEm?'selected':'')+'>'+x+'</option>'}).join('')+'</select></div><div class="field"><label>'+(lang==='ar'?'المدينة / المنطقة':'City / Area')+'</label><input id="checkoutCity" value="'+escapeHtml(defCity)+'"></div></div><div class="field"><label>'+(lang==='ar'?'عنوان التوصيل':'Delivery address')+'</label><textarea id="address" rows="3">'+escapeHtml(defAddr)+'</textarea></div><label style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><input id="saveAddress" type="checkbox" '+(def?'':'checked')+'> '+(lang==='ar'?'حفظ هذا العنوان للمرة القادمة':'Save this address for next time')+'</label><div class="formgrid"><div class="field"><label>'+(lang==='ar'?'كود الخصم':'Coupon code')+'</label><div style="display:flex;gap:6px"><input id="couponCode" style="flex:1;text-transform:uppercase"><button class="btn" onclick="v13ApplyCoupon()">Apply</button></div></div><div class="field"><label>'+(lang==='ar'?'طريقة الدفع':'Payment method')+'</label><select id="paymentMethod"><option value="cash_on_delivery">'+(lang==='ar'?'الدفع عند الاستلام':'Cash on delivery')+'</option><option value="bank_transfer">'+(lang==='ar'?'تحويل بنكي':'Bank transfer')+'</option><option value="whatsapp">'+(lang==='ar'?'تأكيد عبر واتساب':'Confirm via WhatsApp')+'</option></select></div></div><div class="field"><label>'+(lang==='ar'?'ملاحظات الطلب':'Order notes')+'</label><textarea id="orderNotes" rows="2"></textarea></div><div class="totals"><div class="totalrow"><span>'+(lang==='ar'?'المنتجات':'Merchandise')+'</span><span>'+money(v13CartMerchTotal())+'</span></div><div class="totalrow"><span>'+(lang==='ar'?'كوبون':'Coupon')+'</span><span id="v13CouponDiscount">− '+money(0)+'</span></div><div class="totalrow"><span>'+t('shipping')+'</span><span id="v13ShippingFee">'+t('free')+'</span></div><div class="totalrow big"><span>'+t('total')+'</span><span id="v13CheckoutTotal">'+money(v13CartMerchTotal())+'</span></div></div><button id="placeOrderBtn" class="btn gold" style="width:100%" onclick="placeOrder()">'+(lang==='ar'?'تأكيد الطلب':'Place order')+'</button>');
    v13UpdateCheckoutSummary();
  };
  window.v13UpdateCheckoutSummary=v13UpdateCheckoutSummary;

  window.placeOrder=async function(){
    var name=document.getElementById('checkoutName')?.value.trim()||'';
    var mobile=document.getElementById('checkoutMobile')?.value.trim()||'';
    var emirate=document.getElementById('checkoutEmirate')?.value.trim()||'';
    var city=document.getElementById('checkoutCity')?.value.trim()||'';
    var address=document.getElementById('address')?.value.trim()||'';
    var notes=document.getElementById('orderNotes')?.value.trim()||'';
    var payment=document.getElementById('paymentMethod')?.value||'cash_on_delivery';
    if(name.length<2)return toast(lang==='ar'?'أدخل الاسم':'Enter your name');
    if(mobile.length<6)return toast(lang==='ar'?'أدخل رقم الموبايل':'Enter mobile number');
    if(city.length<2)return toast(lang==='ar'?'أدخل المنطقة':'Enter city / area');
    if(address.length<5)return toast(lang==='ar'?'أدخل العنوان':'Enter delivery address');
    var btn=document.getElementById('placeOrderBtn');if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جارٍ إنشاء الطلب…':'Creating order…'}
    var payload=cart.map(function(i){return {id:i.id,variant_id:i.variantId||i.variant_id,size:i.size,color:i.color,qty:i.qty}});
    var r=await sb.rpc('place_order_v3',{p_items:payload,p_customer_name:name,p_mobile:mobile,p_emirate:emirate,p_city:city,p_address:address,p_notes:notes||null,p_payment_method:payment,p_coupon_code:v13Coupon.code||null});
    if(r.error){if(btn){btn.disabled=false;btn.textContent=lang==='ar'?'تأكيد الطلب':'Place order'}toast(r.error.message||'Order failed');await loadProducts();return}
    if(document.getElementById('saveAddress')?.checked){
      await sb.from('customer_addresses').update({is_default:false}).eq('user_id',currentUser.id);
      await sb.from('customer_addresses').insert({user_id:currentUser.id,label:lang==='ar'?'العنوان الرئيسي':'Main address',emirate:emirate,city:city,address:address,is_default:true});
      await sb.from('customers').update({name:name,mobile:mobile,default_emirate:emirate,default_city:city,default_address:address}).eq('id',currentUser.id);
    }else{
      await sb.from('customers').update({name:name,mobile:mobile}).eq('id',currentUser.id);
    }
    currentUser={...currentUser,name:name,mobile:mobile,default_emirate:emirate,default_city:city,default_address:address};
    var o=r.data?.[0];cart=[];saveLocal();updateCartBadge();
    await Promise.all([loadProducts(),loadMyOrders()]);
    showModal('<div class="success"><div class="check">✓</div><h3>'+(lang==='ar'?'تم استلام طلبك بنجاح':'Order received successfully')+'</h3><p>'+t('orderNo')+': <b>'+escapeHtml(o?.order_no||'SNB')+'</b></p>'+(Number(o?.coupon_discount||0)>0?'<p class="muted">'+(lang==='ar'?'وفّرت بالكوبون ':'Coupon saving ')+money(o.coupon_discount)+'</p>':'')+'<p style="color:#f2cf7b;font-size:22px"><b>'+money(o?.total||0)+'</b></p><p class="muted">'+(lang==='ar'?'تتبّع الطلب لحظة بلحظة من حسابك.':'Track the order from your account.')+'</p><button class="btn gold" onclick="closeOverlay();renderAccount()">'+(lang==='ar'?'تتبّع طلبي':'Track my order')+'</button></div>');
  };

  window.setSignedInCustomer=async function(u,notify){
    if(!u)return;
    var r=await sb.from('customers').select('id,email,name,mobile,created_at,confirmed_at,default_emirate,default_city,default_address').eq('id',u.id).maybeSingle();
    var d=r.data;
    currentUser={id:u.id,name:d?.name||u.user_metadata?.name||u.email?.split('@')[0]||'SNB Customer',email:d?.email||u.email||'',mobile:d?.mobile||u.user_metadata?.mobile||'',created:d?.created_at||u.created_at||'',default_emirate:d?.default_emirate||'',default_city:d?.default_city||'',default_address:d?.default_address||''};
    updateAuthUI();
    await Promise.all([loadWishlist(),loadMyOrders(),checkAdmin()]);
    if(typeof subscribeOrderUpdates==='function')await subscribeOrderUpdates();
    if(notify)showAuthWelcome();
    if(localStorage.getItem('snb_pending_checkout')==='1'){localStorage.removeItem('snb_pending_checkout');setTimeout(checkout,250)}
  };

  window.loadMyOrders=async function(){
    if(!currentUser){myOrders=[];return}
    var r=await sb.from('orders').select('id,order_no,total,status,payment_method,address,emirate,city,notes,tracking_number,tracking_carrier,tracking_url,shipping_fee,coupon_code,coupon_discount,created_at,updated_at,order_items(product_id,product_name,size,color,color_name,qty,unit_price,image_url,variant_id),order_status_history(status,created_at)').eq('user_id',currentUser.id).order('created_at',{ascending:false});
    if(!r.error)myOrders=(r.data||[]).map(function(o){o.order_status_history=(o.order_status_history||[]).sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at)});return o});
  };

  window.orderProgressHtml=function(o){
    if(typeof o==='string')o={status:o,order_status_history:[]};
    if(o.status==='cancelled')return '<div class="notice" style="border-color:rgba(209,96,96,.45);color:#ffb0b0">'+statusLabel('cancelled')+'</div>';
    var stages=['received','confirmed','preparing','shipped','out_for_delivery','delivered'];
    var current=Math.max(0,stages.indexOf(o.status));
    var hist=o.order_status_history||[];
    return '<div class="timeline">'+stages.map(function(s,i){var h=hist.find(function(x){return x.status===s});return '<div class="timeline-row '+(i<=current?'done':'')+'"><span class="timeline-dot"></span><b>'+escapeHtml(statusLabel(s))+'</b><span class="timeline-time">'+(h?new Date(h.created_at).toLocaleString():'')+'</span></div>'}).join('')+'</div>';
  };

  function v13OrderCard(o,idx){
    return '<div style="border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>'+escapeHtml(o.order_no)+'</b><span class="status '+(o.status==='cancelled'?'warn':'ok')+'">'+escapeHtml(statusLabel(o.status))+'</span></div>'+orderProgressHtml(o)+'<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#f2cf7b">'+money(o.total)+'</b><div style="display:flex;gap:6px"><button class="btn small" onclick="v13ReorderOrder('+idx+')">'+(lang==='ar'?'إعادة الطلب':'Reorder')+'</button><button class="btn small" onclick="openOrderDetails('+idx+')">'+(lang==='ar'?'التفاصيل':'Details')+'</button></div></div></div>';
  }

  window.renderAccount=async function(){
    if(!currentUser)return renderAuth('login');
    await Promise.all([loadMyOrders(),v13LoadAddresses()]);
    showModal('<div class="modal-head"><h3>'+accountLabel()+'</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div class="formgrid"><div class="field"><label>'+t('name')+'</label><input id="profileName" value="'+escapeHtml(currentUser.name||'')+'"></div><div class="field"><label>'+t('mobile')+'</label><input id="profileMobile" value="'+escapeHtml(currentUser.mobile||'')+'"></div></div><button class="btn" style="width:100%;margin-bottom:12px" onclick="v13SaveProfile()">'+(lang==='ar'?'حفظ بياناتي':'Save profile')+'</button><div class="notice"><b>'+escapeHtml(currentUser.email||'')+'</b><br>♡ '+(lang==='ar'?'المفضلة: ':'Wishlist: ')+wishlist.size+'</div><h4>'+(lang==='ar'?'عناويني':'My addresses')+'</h4><div id="v13AddressList">'+v13AddressListHtml()+'</div><button class="btn small" style="width:100%;margin-bottom:14px" onclick="v13AddAddress()">'+(lang==='ar'?'＋ إضافة عنوان':'＋ Add address')+'</button><h4>'+(lang==='ar'?'طلباتي وتتبع الشحن':'My Orders & Tracking')+'</h4><div id="accountOrders">'+(myOrders.length?myOrders.map(v13OrderCard).join(''):'<div class="empty">'+(lang==='ar'?'لا توجد طلبات بعد':'No orders yet')+'</div>')+'</div><button class="btn ghost" style="width:100%;margin-top:12px" onclick="logoutCustomer()">'+t('logout')+'</button>');
  };

  async function v13LoadAddresses(){
    if(!currentUser){v13Addresses=[];return}
    var r=await sb.from('customer_addresses').select('*').eq('user_id',currentUser.id).order('is_default',{ascending:false}).order('created_at',{ascending:false});
    v13Addresses=r.error?[]:(r.data||[]);
  }
  function v13AddressListHtml(){
    return v13Addresses.length?v13Addresses.map(function(a){return '<div class="addr-card"><div style="flex:1"><b>'+escapeHtml(a.label)+(a.is_default?' ★':'')+'</b><div class="muted">'+escapeHtml(a.emirate+' · '+a.city)+'</div><small>'+escapeHtml(a.address)+'</small></div><button class="btn danger small" onclick="v13DeleteAddress(\''+a.id+'\')">✕</button></div>'}).join(''):'<div class="empty">'+(lang==='ar'?'لا توجد عناوين محفوظة':'No saved addresses')+'</div>';
  }
  window.v13SaveProfile=async function(){
    var name=document.getElementById('profileName')?.value.trim()||'',mobile=document.getElementById('profileMobile')?.value.trim()||'';
    if(name.length<2||mobile.length<6)return toast(lang==='ar'?'تحقق من الاسم والموبايل':'Check name and mobile');
    var r=await sb.from('customers').update({name:name,mobile:mobile}).eq('id',currentUser.id);
    if(r.error)return toast(r.error.message);
    currentUser={...currentUser,name:name,mobile:mobile};updateAuthUI();toast(lang==='ar'?'تم الحفظ ✓':'Saved ✓');
  };
  window.v13AddAddress=function(){
    showModal('<div class="modal-head"><h3>'+(lang==='ar'?'عنوان جديد':'New address')+'</h3><button class="iconbtn close" onclick="renderAccount()">✕</button></div><div class="field"><label>'+(lang==='ar'?'اسم العنوان':'Label')+'</label><input id="addrLabel" value="'+(lang==='ar'?'المنزل':'Home')+'"></div><div class="formgrid"><div class="field"><label>'+(lang==='ar'?'الإمارة':'Emirate')+'</label><select id="addrEmirate">'+['Dubai','Abu Dhabi','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah'].map(function(x){return '<option>'+x+'</option>'}).join('')+'</select></div><div class="field"><label>'+(lang==='ar'?'المنطقة':'Area')+'</label><input id="addrCity"></div></div><div class="field"><label>'+(lang==='ar'?'العنوان':'Address')+'</label><textarea id="addrText" rows="3"></textarea></div><label><input id="addrDefault" type="checkbox"> '+(lang==='ar'?'اجعله العنوان الافتراضي':'Set as default')+'</label><button class="btn gold" style="width:100%;margin-top:12px" onclick="v13SaveAddress()">'+t('save')+'</button>');
  };
  window.v13SaveAddress=async function(){
    var label=document.getElementById('addrLabel')?.value.trim()||'Home',em=document.getElementById('addrEmirate')?.value||'',city=document.getElementById('addrCity')?.value.trim()||'',address=document.getElementById('addrText')?.value.trim()||'',def=!!document.getElementById('addrDefault')?.checked;
    if(city.length<2||address.length<5)return toast(lang==='ar'?'أكمل العنوان':'Complete the address');
    if(def)await sb.from('customer_addresses').update({is_default:false}).eq('user_id',currentUser.id);
    var r=await sb.from('customer_addresses').insert({user_id:currentUser.id,label:label,emirate:em,city:city,address:address,is_default:def});
    if(r.error)return toast(r.error.message);
    if(def)await sb.from('customers').update({default_emirate:em,default_city:city,default_address:address}).eq('id',currentUser.id);
    renderAccount();
  };
  window.v13DeleteAddress=async function(id){
    var r=await sb.from('customer_addresses').delete().eq('id',id).eq('user_id',currentUser.id);
    if(r.error)return toast(r.error.message);
    await v13LoadAddresses();var box=document.getElementById('v13AddressList');if(box)box.innerHTML=v13AddressListHtml();
  };
  window.v13ReorderOrder=function(idx){
    var o=myOrders[idx];if(!o)return;
    var added=0;
    (o.order_items||[]).forEach(function(i){
      var p=products.find(function(x){return x.id===i.product_id});if(!p)return;
      var v=(p.variants||[]).find(function(x){return x.id===i.variant_id&&x.stock>0});if(!v)return;
      var qty=Math.min(Number(i.qty||1),v.stock);
      var found=cart.find(function(x){return x.id===p.id&&(x.variantId||x.variant_id)===v.id});
      if(found)found.qty=Math.min(found.qty+qty,v.stock);else cart.push({id:p.id,variantId:v.id,qty:qty,size:v.size,color:v.color});
      added++;
    });
    saveLocal();updateCartBadge();
    toast(added?(lang==='ar'?'تمت إعادة المنتجات المتوفرة للسلة':'Available items added to cart'):(lang==='ar'?'لا توجد قطع متوفرة من هذا الطلب':'No items from this order are currently available'));
    if(added){closeOverlay();openCart()}
  };

  window.openOrderDetails=function(index){
    var o=myOrders[index];if(!o)return;
    showModal('<div class="modal-head"><h3>'+escapeHtml(o.order_no)+'</h3><button class="iconbtn close" onclick="renderAccount()">✕</button></div>'+orderProgressHtml(o)+'<div style="display:grid;gap:10px">'+(o.order_items||[]).map(function(i){return '<div style="display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:10px"><div class="cart-thumb" style="width:64px">'+(i.image_url?'<img src="'+escapeHtml(i.image_url)+'" alt="">':'◇')+'</div><div><b>'+escapeHtml(i.product_name)+'</b><div class="muted" style="font-size:12px">'+escapeHtml(i.size||'')+' · '+escapeHtml(i.color_name||i.color||'')+'</div><small>'+(lang==='ar'?'الكمية':'Qty')+': '+i.qty+'</small></div><b>'+money(Number(i.unit_price||0)*Number(i.qty||0))+'</b></div>'}).join('')+'</div><div class="notice" style="margin-top:14px">'+escapeHtml([o.emirate,o.city,o.address].filter(Boolean).join(' · '))+(o.notes?'<br><small>'+escapeHtml(o.notes)+'</small>':'')+'</div>'+(o.coupon_discount>0?'<div class="totalrow"><span>Coupon '+escapeHtml(o.coupon_code||'')+'</span><span>− '+money(o.coupon_discount)+'</span></div>':'')+'<div class="totalrow"><span>'+t('shipping')+'</span><span>'+money(o.shipping_fee||0)+'</span></div>'+(o.tracking_number?'<div class="notice">🚚 <b>'+(lang==='ar'?'رقم التتبع':'Tracking')+':</b> '+escapeHtml(o.tracking_number)+(o.tracking_carrier?' · '+escapeHtml(o.tracking_carrier):'')+(o.tracking_url?'<br><a class="btn small" style="display:inline-block;margin-top:8px;text-decoration:none" target="_blank" rel="noopener" href="'+escapeHtml(o.tracking_url)+'">'+(lang==='ar'?'تتبع الشحنة':'Track shipment')+'</a>':'')+'</div>':'')+'<div class="totalrow big"><span>'+t('total')+'</span><span>'+money(o.total)+'</span></div><button class="btn" style="width:100%" onclick="v13ReorderOrder('+index+')">'+(lang==='ar'?'إعادة الطلب':'Reorder')+'</button>');
  };

  window.updateOrderTracking=async function(id){
    var carrier=document.getElementById('carrier-'+id)?.value.trim()||'',number=document.getElementById('tracking-'+id)?.value.trim()||'',url=document.getElementById('trackingurl-'+id)?.value.trim()||'';
    var r=await sb.from('orders').update({tracking_carrier:carrier||null,tracking_number:number||null,tracking_url:url||null,updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error)return toast(r.error.message||'Could not save tracking');
    var o=orders.find(function(x){return x.id===id});if(o){o.tracking_carrier=carrier;o.tracking_number=number;o.tracking_url=url}
    toast(lang==='ar'?'تم حفظ التتبع ✓':'Tracking saved ✓');
  };

  window.loadAdminData=async function(){
    var arr=await Promise.all([
      sb.from('products').select('*,product_variants(*),product_images(*)').order('created_at',{ascending:false}),
      sb.from('orders').select('*,order_items(*)').order('created_at',{ascending:false}),
      sb.from('customers').select('*').order('created_at',{ascending:false}),
      sb.from('coupons').select('*').order('created_at',{ascending:false}),
      sb.from('shipping_rules').select('*').order('emirate'),
      sb.from('inventory_movements').select('*,products(name),product_variants(size,color,color_name)').order('created_at',{ascending:false}).limit(250)
    ]);
    if(arr[0].error)throw arr[0].error;if(arr[1].error)throw arr[1].error;if(arr[2].error)throw arr[2].error;
    products=(arr[0].data||[]).map(normalizeProduct);
    orders=(arr[1].data||[]).map(function(o){return {...o,customer:o.customer_name,date:new Date(o.created_at).toLocaleString(),items:o.order_items||[]}});
    customers=(arr[2].data||[]).map(function(c){return {...c,created:new Date(c.created_at).toLocaleString()}});
    window.v13AdminCoupons=arr[3].error?[]:(arr[3].data||[]);
    window.v13AdminShipping=arr[4].error?[]:(arr[4].data||[]);
    window.v13AdminInventory=arr[5].error?[]:(arr[5].data||[]);
  };

  function v13SubscribeAdminOrders(){
    if(v13AdminOrderChannel){try{sb.removeChannel(v13AdminOrderChannel)}catch(e){}}
    v13AdminOrderChannel=sb.channel('snb-admin-orders').on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},async function(){
      if(Notification.permission==='granted')new Notification('SNB Leather Goods',{body:lang==='ar'?'طلب جديد وصل للمتجر':'New order received',icon:'assets/SNB-App-Icon.png'});
      toast(lang==='ar'?'🔴 وصل طلب جديد':'🔴 New order received');
      await loadAdminData();
      if(document.getElementById('adminApp'))renderAdminReplace('dashboard');
    }).subscribe();
  }
  window.v13EnableBrowserNotifications=async function(){
    if(!('Notification'in window))return toast(lang==='ar'?'الإشعارات غير مدعومة':'Notifications are not supported');
    var p=await Notification.requestPermission();
    toast(p==='granted'?(lang==='ar'?'تم تفعيل إشعارات الطلبات ✓':'Order alerts enabled ✓'):(lang==='ar'?'لم يتم السماح بالإشعارات':'Notifications not allowed'));
  };

  window.renderAdmin=function(tab){
    tab=tab||'dashboard';
    document.getElementById('customerApp').classList.add('hidden');document.getElementById('bottomnav').classList.add('hidden');document.getElementById('adminApp')?.remove();
    var received=orders.filter(function(o){return o.status==='received'}).length;
    document.body.insertAdjacentHTML('beforeend','<div id="adminApp" class="admin"><header class="topbar" style="position:sticky"><div class="logo"><img src="assets/SNB-App-Icon.png"><div class="logo-text"><b>SNB ADMIN</b><small>LEATHER GOODS</small></div></div><div class="spacer"></div>'+(received?'<span class="admin-alert">'+received+'</span>':'')+'<button class="btn" onclick="exitAdmin()">← '+t('shop')+'</button></header><div class="admin-shell"><aside class="sidebar"><button class="btn '+(tab==='dashboard'?'gold':'')+'" onclick="renderAdminReplace(\'dashboard\')">▦ '+t('dashboard')+'</button><button class="btn '+(tab==='products'?'gold':'')+'" onclick="renderAdminReplace(\'products\')">◇ '+t('products')+'</button><button class="btn '+(tab==='orders'?'gold':'')+'" onclick="renderAdminReplace(\'orders\')">🧾 '+t('orders')+(received?' <span class="admin-alert">'+received+'</span>':'')+'</button><button class="btn '+(tab==='customers'?'gold':'')+'" onclick="renderAdminReplace(\'customers\')">👥 '+t('customers')+'</button><button class="btn '+(tab==='coupons'?'gold':'')+'" onclick="renderAdminReplace(\'coupons\')">％ Coupons</button><button class="btn '+(tab==='shipping'?'gold':'')+'" onclick="renderAdminReplace(\'shipping\')">🚚 Shipping</button><button class="btn '+(tab==='inventory'?'gold':'')+'" onclick="renderAdminReplace(\'inventory\')">▤ Inventory</button></aside><main class="admin-main" id="adminMain"></main></div></div>');
    renderAdminTab(tab,orders.filter(function(o){return o.status!=='cancelled'}).reduce(function(s,o){return s+Number(o.total||0)},0));
    v13SubscribeAdminOrders();
  };

  window.renderAdminTab=function(tab,revenue){
    var el=document.getElementById('adminMain');if(!el)return;
    if(tab==='dashboard'){
      var today=new Date().toISOString().slice(0,10);
      var salesToday=orders.filter(function(o){return o.status!=='cancelled'&&String(o.created_at||'').slice(0,10)===today}).reduce(function(s,o){return s+Number(o.total||0)},0);
      var newOrders=orders.filter(function(o){return o.status==='received'}).length;
      var low=[];
      products.forEach(function(p){(p.variants||[]).forEach(function(v){if(v.stock>0&&v.stock<=Number(p.low_stock_threshold??2))low.push({p:p,v:v})})});
      el.innerHTML='<div class="section-head"><div><h3>'+t('dashboard')+'</h3><span>Supabase Cloud · Live</span></div></div><div class="stats"><div class="stat"><b>'+newOrders+'</b><small>🔴 '+(lang==='ar'?'طلبات جديدة':'New orders')+'</small></div><div class="stat"><b>'+money(salesToday)+'</b><small>'+(lang==='ar'?'مبيعات اليوم':'Sales today')+'</small></div><div class="stat"><b>'+products.length+'</b><small>'+t('products')+'</small></div><div class="stat"><b>'+low.length+'</b><small>'+(lang==='ar'?'مخزون منخفض':'Low stock')+'</small></div></div><button class="btn" style="margin-top:12px" onclick="v13EnableBrowserNotifications()">🔔 '+(lang==='ar'?'فعّل تنبيه الطلبات على الجهاز':'Enable order alerts')+'</button><h4 style="margin-top:18px">'+(lang==='ar'?'بحاجة لإعادة تخزين':'Restock soon')+'</h4><div class="tablewrap"><table class="table"><thead><tr><th>'+t('productName')+'</th><th>'+t('size')+'</th><th>'+t('color')+'</th><th>'+t('stock')+'</th></tr></thead><tbody>'+(low.length?low.map(function(x){return '<tr><td>'+escapeHtml(x.p.name)+'</td><td>'+escapeHtml(x.v.size)+'</td><td>'+escapeHtml(x.v.color_name||x.v.color)+'</td><td class="stock-low"><b>'+x.v.stock+'</b></td></tr>'}).join(''):'<tr><td colspan="4" class="empty">✓</td></tr>')+'</tbody></table></div>';
      return;
    }
    if(tab==='products'){
      el.innerHTML='<div class="section-head"><div><h3>'+t('products')+'</h3><span>'+products.length+'</span></div><div class="spacer"></div><button class="btn gold" onclick="editProduct()">＋ '+t('addProduct')+'</button></div><div class="tablewrap"><table class="table"><thead><tr><th>'+t('productName')+'</th><th>'+t('category')+'</th><th>'+t('price')+'</th><th>'+t('stock')+'</th><th>Badges</th><th>'+t('status')+'</th><th></th></tr></thead><tbody>'+products.map(function(p){var badges=[p.is_new?'NEW':'',p.is_best_seller?'BEST SELLER':''].filter(Boolean).join(' · ');return '<tr><td><b>'+escapeHtml(p.name)+'</b></td><td>'+t(p.category)+'</td><td>'+money(p.price)+'</td><td>'+p.stock+'</td><td>'+escapeHtml(badges||'—')+'</td><td><span class="status '+(p.active?'ok':'warn')+'">'+(p.active?t('active'):t('inactive'))+'</span></td><td><button class="btn small" onclick="editProduct(\''+p.id+'\')">'+t('edit')+'</button> <button class="btn small danger" onclick="deleteProduct(\''+p.id+'\')">'+t('delete')+'</button></td></tr>'}).join('')+'</tbody></table></div>';
      return;
    }
    if(tab==='orders'){
      var sts=['received','confirmed','preparing','shipped','out_for_delivery','delivered','cancelled'];
      el.innerHTML='<div class="section-head"><div><h3>'+t('orders')+'</h3><span>'+orders.length+'</span></div></div><div class="tablewrap"><table class="table" style="min-width:1320px"><thead><tr><th>'+t('orderNo')+'</th><th>'+t('customer')+'</th><th>'+t('total')+'</th><th>'+t('status')+'</th><th>'+(lang==='ar'?'التتبع':'Tracking')+'</th><th>'+t('date')+'</th></tr></thead><tbody>'+(orders.length?orders.map(function(o){return '<tr><td><b>'+escapeHtml(o.order_no)+'</b>'+(o.status==='received'?' <span class="admin-alert">NEW</span>':'')+'</td><td>'+escapeHtml(o.customer||'—')+'<br><small class="muted">'+escapeHtml(o.mobile||o.email||'')+'</small><br><small>'+escapeHtml([o.emirate,o.city].filter(Boolean).join(' · '))+'</small></td><td>'+money(o.total)+'</td><td><select onchange="updateOrderStatus(\''+o.id+'\',this.value)">'+sts.map(function(s){return '<option value="'+s+'" '+(o.status===s?'selected':'')+'>'+escapeHtml(statusLabel(s))+'</option>'}).join('')+'</select></td><td><input id="carrier-'+o.id+'" placeholder="Carrier" value="'+escapeHtml(o.tracking_carrier||'')+'" style="width:130px;margin-bottom:4px"><br><input id="tracking-'+o.id+'" placeholder="Tracking no." value="'+escapeHtml(o.tracking_number||'')+'" style="width:150px;margin-bottom:4px"><br><input id="trackingurl-'+o.id+'" placeholder="Tracking URL" value="'+escapeHtml(o.tracking_url||'')+'" style="width:190px"><button class="btn small" style="margin-inline-start:4px" onclick="updateOrderTracking(\''+o.id+'\')">✓</button></td><td>'+escapeHtml(o.date)+'</td></tr>'}).join(''):'<tr><td colspan="6" class="empty">—</td></tr>')+'</tbody></table></div>';
      return;
    }
    if(tab==='customers'){
      el.innerHTML='<div class="section-head"><div><h3>'+t('customers')+'</h3><span>'+customers.length+'</span></div></div><div class="tablewrap"><table class="table"><thead><tr><th>'+t('name')+'</th><th>'+t('email')+'</th><th>'+t('mobile')+'</th><th>'+t('date')+'</th></tr></thead><tbody>'+(customers.length?customers.map(function(c){return '<tr><td><b>'+escapeHtml(c.name||'—')+'</b></td><td>'+escapeHtml(c.email||'—')+'</td><td>'+escapeHtml(c.mobile||'—')+'</td><td>'+escapeHtml(c.created)+'</td></tr>'}).join(''):'<tr><td colspan="4" class="empty">—</td></tr>')+'</tbody></table></div>';
      return;
    }
    if(tab==='coupons'){
      var cs=window.v13AdminCoupons||[];
      el.innerHTML='<div class="section-head"><div><h3>Coupons</h3><span>'+cs.length+'</span></div><div class="spacer"></div><button class="btn gold" onclick="v13EditCoupon()">＋ Coupon</button></div><div class="tablewrap"><table class="table"><thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Uses</th><th>Status</th><th></th></tr></thead><tbody>'+(cs.length?cs.map(function(c){return '<tr><td><b>'+escapeHtml(c.code)+'</b></td><td>'+(c.discount_type==='percent'?c.discount_value+'%':money(c.discount_value))+'</td><td>'+money(c.min_order)+'</td><td>'+c.uses_count+(c.max_uses?'/'+c.max_uses:'')+'</td><td>'+(c.active?'✓':'—')+'</td><td><button class="btn small" onclick="v13EditCoupon(\''+escapeHtml(c.code)+'\')">'+t('edit')+'</button> <button class="btn small danger" onclick="v13DeleteCoupon(\''+escapeHtml(c.code)+'\')">'+t('delete')+'</button></td></tr>'}).join(''):'<tr><td colspan="6" class="empty">—</td></tr>')+'</tbody></table></div>';
      return;
    }
    if(tab==='shipping'){
      var rs=window.v13AdminShipping||[];
      el.innerHTML='<div class="section-head"><div><h3>Shipping</h3><span>UAE</span></div></div><div class="notice">'+(lang==='ar'?'حالياً كل الإمارات مجانية. غيّر الرسوم وحد الإعفاء متى شئت. إذا Free over = 0 يبقى الشحن مجانياً دائماً.':'All Emirates are currently free. Set a fee and free-shipping threshold whenever needed. Free over = 0 means always free.')+'</div><div class="tablewrap"><table class="table"><thead><tr><th>Emirate</th><th>Fee AED</th><th>Free over AED</th><th>Active</th><th></th></tr></thead><tbody>'+rs.map(function(r){return '<tr><td><b>'+escapeHtml(r.emirate)+'</b></td><td><input id="shipfee-'+escapeHtml(r.emirate)+'" type="number" min="0" value="'+Number(r.fee||0)+'" style="width:100px"></td><td><input id="shipfree-'+escapeHtml(r.emirate)+'" type="number" min="0" value="'+Number(r.free_over||0)+'" style="width:120px"></td><td><input id="shipactive-'+escapeHtml(r.emirate)+'" type="checkbox" '+(r.active?'checked':'')+'></td><td><button class="btn small" onclick="v13SaveShipping(\''+escapeHtml(r.emirate)+'\')">'+t('save')+'</button></td></tr>'}).join('')+'</tbody></table></div>';
      return;
    }
    if(tab==='inventory'){
      var ms=window.v13AdminInventory||[];
      el.innerHTML='<div class="section-head"><div><h3>Inventory Log</h3><span>'+ms.length+'</span></div></div><div class="tablewrap"><table class="table"><thead><tr><th>Date</th><th>Product</th><th>Option</th><th>Change</th><th>Reason</th><th>Note</th></tr></thead><tbody>'+(ms.length?ms.map(function(m){var v=m.product_variants||{};return '<tr><td>'+new Date(m.created_at).toLocaleString()+'</td><td>'+escapeHtml(m.products?.name||m.product_id)+'</td><td>'+escapeHtml([v.size,v.color_name||v.color].filter(Boolean).join(' · '))+'</td><td style="color:'+(m.qty_change<0?'#ffadad':'#83e3a4')+'"><b>'+(m.qty_change>0?'+':'')+m.qty_change+'</b></td><td>'+escapeHtml(m.reason)+'</td><td>'+escapeHtml(m.note||'')+'</td></tr>'}).join(''):'<tr><td colspan="6" class="empty">—</td></tr>')+'</tbody></table></div>';
    }
  };

  window.v13SaveShipping=async function(em){
    var fee=Number(document.getElementById('shipfee-'+em)?.value||0),free=Number(document.getElementById('shipfree-'+em)?.value||0),active=!!document.getElementById('shipactive-'+em)?.checked;
    var r=await sb.from('shipping_rules').update({fee:Math.max(0,fee),free_over:Math.max(0,free),active:active,updated_at:new Date().toISOString()}).eq('emirate',em);
    if(r.error)return toast(r.error.message);await loadAdminData();toast(lang==='ar'?'تم حفظ الشحن ✓':'Shipping saved ✓');
  };

  window.v13EditCoupon=function(code){
    var c=(window.v13AdminCoupons||[]).find(function(x){return x.code===code})||{code:'',discount_type:'percent',discount_value:10,min_order:0,max_uses:null,active:true,starts_at:null,ends_at:null};
    showModal('<div class="modal-head"><h3>Coupon</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div class="formgrid"><div class="field"><label>Code</label><input id="cpCode" value="'+escapeHtml(c.code)+'" '+(code?'readonly':'')+' style="text-transform:uppercase"></div><div class="field"><label>Type</label><select id="cpType"><option value="percent" '+(c.discount_type==='percent'?'selected':'')+'>Percent</option><option value="fixed" '+(c.discount_type==='fixed'?'selected':'')+'>Fixed AED</option></select></div><div class="field"><label>Value</label><input id="cpValue" type="number" min="0.01" value="'+Number(c.discount_value||0)+'"></div><div class="field"><label>Min order</label><input id="cpMin" type="number" min="0" value="'+Number(c.min_order||0)+'"></div><div class="field"><label>Max uses</label><input id="cpMax" type="number" min="1" value="'+(c.max_uses??'')+'" placeholder="Unlimited"></div><div class="field"><label>Status</label><select id="cpActive"><option value="1" '+(c.active?'selected':'')+'>Active</option><option value="0" '+(!c.active?'selected':'')+'>Inactive</option></select></div><div class="field"><label>Starts</label><input id="cpStart" type="datetime-local" value="'+(c.starts_at?String(c.starts_at).slice(0,16):'')+'"></div><div class="field"><label>Ends</label><input id="cpEnd" type="datetime-local" value="'+(c.ends_at?String(c.ends_at).slice(0,16):'')+'"></div></div><button class="btn gold" style="width:100%" onclick="v13SaveCoupon()">'+t('save')+'</button>');
  };
  window.v13SaveCoupon=async function(){
    var code=document.getElementById('cpCode')?.value.trim().toUpperCase()||'',type=document.getElementById('cpType')?.value||'percent',value=Number(document.getElementById('cpValue')?.value||0),min=Number(document.getElementById('cpMin')?.value||0),max=document.getElementById('cpMax')?.value,start=document.getElementById('cpStart')?.value,end=document.getElementById('cpEnd')?.value,active=document.getElementById('cpActive')?.value==='1';
    if(code.length<2||value<=0)return toast(lang==='ar'?'تحقق من الكوبون':'Check coupon');
    var obj={code:code,discount_type:type,discount_value:value,min_order:Math.max(0,min),max_uses:max?Number(max):null,active:active,starts_at:start?new Date(start).toISOString():null,ends_at:end?new Date(end).toISOString():null,updated_at:new Date().toISOString()};
    var r=await sb.from('coupons').upsert(obj,{onConflict:'code'});if(r.error)return toast(r.error.message);closeOverlay();await loadAdminData();renderAdminReplace('coupons');
  };
  window.v13DeleteCoupon=async function(code){
    if(!confirm(lang==='ar'?'حذف الكوبون؟':'Delete coupon?'))return;
    var r=await sb.from('coupons').delete().eq('code',code);if(r.error)return toast(r.error.message);await loadAdminData();renderAdminReplace('coupons');
  };

  window.variantRowHtml=function(v){
    v=v||{};
    var safe=/^#[0-9a-f]{6}$/i.test(v.color||'')?v.color:'#111111';
    return '<div class="variant-row variant-row-v13" data-id="'+escapeHtml(v.id||'')+'" style="display:grid;grid-template-columns:1fr .8fr 1fr .7fr auto;gap:8px;align-items:end;margin-bottom:8px"><div class="field" style="margin:0"><label>'+t('size')+'</label><input class="variant-size" value="'+escapeHtml(v.size||'One Size')+'"></div><div class="field" style="margin:0"><label>'+t('color')+'</label><input class="variant-color" type="color" value="'+safe+'"></div><div class="field" style="margin:0"><label>'+(lang==='ar'?'اسم اللون':'Color name')+'</label><input class="variant-color-name" value="'+escapeHtml(v.color_name||'')+'" placeholder="Black / أسود"></div><div class="field" style="margin:0"><label>'+t('stock')+'</label><input class="variant-stock" type="number" min="0" value="'+Number(v.stock||0)+'" oninput="refreshVariantStock()"></div><button type="button" class="btn danger small" onclick="this.closest(\'.variant-row\').remove();refreshVariantStock()">✕</button></div>';
  };
  window.addVariantRow=function(size,color,stock){
    document.getElementById('variantRows')?.insertAdjacentHTML('beforeend',variantRowHtml({size:size||'One Size',color:color||'#111111',stock:stock||0}));
    refreshVariantStock();
  };
  window.v13DeleteProductImage=async function(id){
    var r=await sb.from('product_images').delete().eq('id',id);if(r.error)return toast(r.error.message);
    document.querySelector('[data-image-id="'+id+'"]')?.remove();
  };

  window.editProduct=function(id){
    id=id||'';
    var p=id?products.find(function(x){return x.id===id}):{id:'p'+Date.now(),name:'',category:'shoes',price:0,discount:0,stock:0,type:'shoe',sizes:['40'],active:true,image_url:'',variants:[{size:'40',color:'#111111',color_name:'Black',stock:0}],product_images:[],is_new:true,is_best_seller:false,low_stock_threshold:2};
    var image=p.image_url||p.image||'',variants=p.variants?.length?p.variants:[{size:p.sizes?.[0]||'One Size',color:p.color||'#111111',stock:Number(p.stock||0)}],imgs=Array.isArray(p.product_images)?p.product_images:[];
    showModal('<div class="modal-head"><h3>'+(id?t('edit'):t('addProduct'))+'</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div><div class="field"><label>'+(lang==='ar'?'الصورة الرئيسية':'Main photo')+'</label>'+(image?'<img id="pImagePreview" class="image-preview" src="'+escapeHtml(image)+'" alt="">':'<img id="pImagePreview" class="image-preview hidden" alt="">')+'<input id="pImage" type="file" accept="image/jpeg,image/png,image/webp" onchange="previewProductImage(this)"></div><div class="field"><label>'+(lang==='ar'?'صور إضافية للـGallery':'Additional gallery photos')+'</label><input id="pExtraImages" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="image-strip">'+imgs.map(function(x){return '<div class="image-chip" data-image-id="'+x.id+'"><img src="'+escapeHtml(x.image_url)+'"><button onclick="v13DeleteProductImage(\''+x.id+'\')">✕</button></div>'}).join('')+'</div></div><div class="formgrid"><div class="field"><label>'+t('productName')+'</label><input id="pName" value="'+escapeHtml(p.name)+'"></div><div class="field"><label>'+t('category')+'</label><select id="pCat"><option value="shoes" '+(p.category==='shoes'?'selected':'')+'>'+t('shoes')+'</option><option value="bags" '+(p.category==='bags'?'selected':'')+'>'+t('bags')+'</option><option value="wallets" '+(p.category==='wallets'?'selected':'')+'>'+t('wallets')+'</option></select></div><div class="field"><label>'+t('price')+' AED</label><input id="pPrice" type="number" min="0" step=".01" value="'+p.price+'"></div><div class="field"><label>'+t('discount')+' %</label><input id="pDiscount" type="number" min="0" max="90" value="'+p.discount+'"></div><div class="field"><label>'+t('status')+'</label><select id="pActive"><option value="1" '+(p.active?'selected':'')+'>'+t('active')+'</option><option value="0" '+(!p.active?'selected':'')+'>'+t('inactive')+'</option></select></div><div class="field"><label>Low stock ≤</label><input id="pLowStock" type="number" min="0" value="'+Number(p.low_stock_threshold??2)+'"></div></div><div style="display:flex;gap:14px;margin:8px 0 14px"><label><input id="pIsNew" type="checkbox" '+(p.is_new?'checked':'')+'> NEW</label><label><input id="pBest" type="checkbox" '+(p.is_best_seller?'checked':'')+'> BEST SELLER</label></div><div class="notice">'+(lang==='ar'?'كل مقاس ولون له مخزون مستقل.':'Every size/color has independent stock.')+'</div><div id="variantRows">'+variants.map(variantRowHtml).join('')+'</div><div style="display:flex;gap:8px;align-items:center;margin:10px 0 14px"><button type="button" class="btn small" onclick="addVariantRow()">＋ '+(lang==='ar'?'إضافة خيار':'Add option')+'</button><span class="muted">'+(lang==='ar'?'إجمالي المخزون':'Total stock')+': <b id="variantStockTotal">'+variants.reduce(function(s,v){return s+Number(v.stock||0)},0)+'</b></span></div><button id="saveProductBtn" class="btn gold" style="width:100%" onclick="saveProduct(\''+p.id+'\','+(id?1:0)+')">'+t('save')+'</button>');
  };

  async function v13UploadImage(file,id){
    var blob=await compressProductImageBlob(file);
    var path=id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,7)+'.webp';
    var up=await sb.storage.from('product-images').upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:false});
    if(up.error)throw up.error;
    return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }

  window.saveProduct=async function(id,exists){
    var name=document.getElementById('pName')?.value.trim()||'',cat=document.getElementById('pCat')?.value||'shoes',price=Number(document.getElementById('pPrice')?.value||0),discount=Number(document.getElementById('pDiscount')?.value||0);
    var variants=[...document.querySelectorAll('.variant-row')].map(function(row){return {size:row.querySelector('.variant-size')?.value.trim()||'One Size',color:row.querySelector('.variant-color')?.value||'#111111',color_name:row.querySelector('.variant-color-name')?.value.trim()||null,stock:Math.max(0,Number(row.querySelector('.variant-stock')?.value||0))}});
    if(!name||price<0||discount<0||discount>90||!variants.length)return toast(lang==='ar'?'تحقق من بيانات المنتج':'Check product data');
    var keys=variants.map(function(v){return v.size.toLowerCase()+'|'+v.color.toLowerCase()});if(new Set(keys).size!==keys.length)return toast(lang==='ar'?'يوجد مقاس/لون مكرر':'Duplicate size/color');
    var stock=variants.reduce(function(s,v){return s+v.stock},0),sizes=[...new Set(variants.map(function(v){return v.size}))],old=exists?products.find(function(x){return x.id===id}):null,image_url=old?.image_url||old?.image||null,btn=document.getElementById('saveProductBtn');
    if(btn){btn.disabled=true;btn.textContent=lang==='ar'?'جارٍ الحفظ…':'Saving…'}
    try{
      var main=document.getElementById('pImage')?.files?.[0];if(main)image_url=await v13UploadImage(main,id);
      var obj={id:id,name:name,category:cat,price:price,discount:discount,stock:stock,color:variants[0].color,type:cat==='bags'?'bag':cat==='wallets'?'wallet':'shoe',sizes:sizes,active:document.getElementById('pActive')?.value==='1',image_url:image_url,is_new:!!document.getElementById('pIsNew')?.checked,is_best_seller:!!document.getElementById('pBest')?.checked,low_stock_threshold:Math.max(0,Number(document.getElementById('pLowStock')?.value||2)),updated_at:new Date().toISOString()};
      var q=exists?await sb.from('products').update(obj).eq('id',id):await sb.from('products').insert(obj);
      if(q.error)throw q.error;
      var sync=await sb.rpc('sync_product_variants_v2',{p_product_id:id,p_variants:variants});if(sync.error)throw sync.error;
      if(image_url){
        var mainRow=await sb.from('product_images').select('id').eq('product_id',id).eq('image_url',image_url).maybeSingle();
        if(!mainRow.data)await sb.from('product_images').insert({product_id:id,image_url:image_url,sort_order:0});
      }
      var extras=[...(document.getElementById('pExtraImages')?.files||[])],base=(old?.product_images||[]).length+1;
      for(var i=0;i<extras.length;i++){var url=await v13UploadImage(extras[i],id);await sb.from('product_images').insert({product_id:id,image_url:url,sort_order:base+i})}
      closeOverlay();await loadAdminData();renderAdminReplace('products');
    }catch(e){if(btn){btn.disabled=false;btn.textContent=t('save')}toast(e.message||'Could not save product')}
  };

  function v13PatchOpenAdmin(){
    var oldOpen=window.openAdminLogin;
    window.openAdminLogin=async function(){
      if(!currentUser)return oldOpen();
      if(!await checkAdmin())return toast(lang==='ar'?'هذا الحساب ليس حساب الإدارة. سجّل الدخول بحساب الإدارة الأساسي.':'This account is not an admin account. Sign in with the main admin account.');
      closeOverlay();await loadAdminData();renderAdmin('dashboard');
    };
  }

  async function v13Init(){
    v13Css();v13Splash();v13EnsureStoreTools();v13PatchOpenAdmin();
    try{await loadProducts()}catch(e){console.error(e)}
    try{if(currentUser)await setSignedInCustomer({id:currentUser.id,email:currentUser.email,user_metadata:{name:currentUser.name,mobile:currentUser.mobile},created_at:currentUser.created})}catch(e){console.error(e)}
  }

  window.addEventListener('load',function(){setTimeout(v13Init,30)});
})();
