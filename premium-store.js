// SNB Premium Store Layer v1
const PS={sort:'newest',size:'',color:'',min:'',max:'',selectedProduct:'',selectedSize:'',selectedColor:''};

function psColorLabel(v){return v?.color_name||v?.color||''}
function psImages(p){
  const rows=(Array.isArray(p?.product_images)?p.product_images:[]).slice().sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
  const primary=p?.image_url||p?.image||'';
  const out=[];
  if(primary)out.push({id:'primary',image_url:primary,sort_order:-1});
  for(const r of rows)if(r?.image_url&&!out.some(x=>x.image_url===r.image_url))out.push(r);
  return out;
}
function normalizeProduct(p){
  const variants=(Array.isArray(p.product_variants)?p.product_variants:Array.isArray(p.variants)?p.variants:[])
    .map(v=>({...v,stock:Number(v.stock||0)}))
    .sort((a,b)=>String(a.size).localeCompare(String(b.size),undefined,{numeric:true})||String(psColorLabel(a)).localeCompare(String(psColorLabel(b))));
  const fallback=Array.isArray(p.sizes)?p.sizes:String(p.sizes||'One Size').split(',').map(x=>x.trim()).filter(Boolean);
  return {...p,price:Number(p.price||0),discount:Number(p.discount||0),stock:variants.length?variants.reduce((s,v)=>s+v.stock,0):Number(p.stock||0),sizes:variants.length?[...new Set(variants.map(v=>v.size||'One Size'))]:fallback,variants,product_images:Array.isArray(p.product_images)?p.product_images:[],low_stock_threshold:Number(p.low_stock_threshold??2),image:p.image_url||p.image||''};
}
async function loadProducts(){
  const {data,error}=await sb.from('products').select('*,product_variants(*),product_images(*)').order('created_at',{ascending:false});
  if(error){console.error(error);return false}
  products=(data||[]).map(normalizeProduct);
  if(typeof repairCart==='function')repairCart();
  psEnsureTools();
  renderProducts();
  return true;
}
function psEnsureTools(){
  if(document.getElementById('psStoreTools'))return;
  const filters=document.getElementById('filters');
  if(!filters)return;
  filters.insertAdjacentHTML('beforebegin',`<div id="psStoreTools" class="snb-store-tools" style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:8px 0 12px">
    <div class="field" style="margin:0;min-width:130px;flex:1"><label>${lang==='ar'?'الترتيب':'Sort'}</label><select id="psSort" onchange="PS.sort=this.value;renderProducts()"><option value="newest">${lang==='ar'?'الأحدث':'Newest'}</option><option value="price_low">${lang==='ar'?'السعر: الأقل':'Price: Low'}</option><option value="price_high">${lang==='ar'?'السعر: الأعلى':'Price: High'}</option><option value="bestseller">${lang==='ar'?'الأكثر مبيعاً':'Best seller'}</option><option value="stock">${lang==='ar'?'الأكثر توفراً':'Most stock'}</option></select></div>
    <div class="field" style="margin:0;min-width:110px;flex:1"><label>${lang==='ar'?'المقاس':'Size'}</label><input id="psSize" placeholder="${lang==='ar'?'مثال 42':'e.g. 42'}" oninput="PS.size=this.value.trim().toLowerCase();renderProducts()"></div>
    <div class="field" style="margin:0;min-width:120px;flex:1"><label>${lang==='ar'?'اللون':'Color'}</label><input id="psColor" placeholder="${lang==='ar'?'أسود / Black':'Black'}" oninput="PS.color=this.value.trim().toLowerCase();renderProducts()"></div>
    <div class="field" style="margin:0;min-width:95px;flex:.7"><label>${lang==='ar'?'من سعر':'Min'}</label><input id="psMin" type="number" min="0" oninput="PS.min=this.value;renderProducts()"></div>
    <div class="field" style="margin:0;min-width:95px;flex:.7"><label>${lang==='ar'?'إلى سعر':'Max'}</label><input id="psMax" type="number" min="0" oninput="PS.max=this.value;renderProducts()"></div>
    <button class="btn small" onclick="psResetFilters()">↺ ${lang==='ar'?'مسح':'Reset'}</button>
  </div>`);
}
function psResetFilters(){
  PS.sort='newest';PS.size='';PS.color='';PS.min='';PS.max='';
  for(const id of ['psSize','psColor','psMin','psMax']){const e=document.getElementById(id);if(e)e.value=''}
  const s=document.getElementById('psSort');if(s)s.value='newest';
  renderProducts();
}
function psBadges(p){
  const b=[];
  if(p.is_new)b.push(`<span class="snb-tag">NEW</span>`);
  if(p.is_best_seller)b.push(`<span class="snb-tag">BEST SELLER</span>`);
  if(p.stock>0&&p.stock<=p.low_stock_threshold)b.push(`<span class="snb-tag" style="color:#ffb0b0">LOW STOCK</span>`);
  return b.length?`<div style="position:absolute;top:10px;left:10px;z-index:5;display:grid;gap:4px">${b.join('')}</div>`:'';
}
function renderProducts(){
  psEnsureTools();
  let list=products.filter(p=>{
    if(!p.active)return false;
    if(category!=='all'&&p.category!==category)return false;
    if(typeof wishlistOnly!=='undefined'&&wishlistOnly&&!wishlist.has(p.id))return false;
    const q=(typeof searchTerm!=='undefined'?searchTerm:(typeof searchQuery!=='undefined'?searchQuery:'')).toLowerCase();
    if(q&&!String(p.name||'').toLowerCase().includes(q)&&!String(p.category||'').toLowerCase().includes(q))return false;
    if(PS.size&&!p.variants.some(v=>String(v.size||'').toLowerCase().includes(PS.size)))return false;
    if(PS.color&&!p.variants.some(v=>String(psColorLabel(v)).toLowerCase().includes(PS.color)))return false;
    const price=finalPrice(p);
    if(PS.min!==''&&price<Number(PS.min))return false;
    if(PS.max!==''&&price>Number(PS.max))return false;
    return true;
  });
  if(PS.sort==='bestseller')list.sort((a,b)=>Number(b.is_best_seller)-Number(a.is_best_seller)||new Date(b.created_at||0)-new Date(a.created_at||0));
  else if(PS.sort==='price_low')list.sort((a,b)=>finalPrice(a)-finalPrice(b));
  else if(PS.sort==='price_high')list.sort((a,b)=>finalPrice(b)-finalPrice(a));
  else if(PS.sort==='stock')list.sort((a,b)=>b.stock-a.stock);
  else list.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  const grid=document.getElementById('productGrid');if(!grid)return;
  grid.innerHTML=list.map(p=>`<article class="product">${psBadges(p)}${p.discount?`<div class="sale">-${p.discount}%</div>`:''}
    <button aria-label="Wishlist" onclick="toggleWishlist(event,'${p.id}')" style="position:absolute;top:10px;right:10px;z-index:6;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:rgba(8,7,5,.86);color:${wishlist.has(p.id)?'#f3d58c':'#fff'};font-size:20px;cursor:pointer">${wishlist.has(p.id)?'♥':'♡'}</button>
    <div class="product-media" onclick="viewProduct('${p.id}')">${productVisual(p)}</div>
    <div class="product-body"><h4>${escapeHtml(p.name)}</h4><div class="price"><strong>${money(finalPrice(p))}</strong>${p.discount?`<span class="old">${money(p.price)}</span>`:''}</div>
    <div class="meta"><span>${t('stock')}: ${p.stock}</span><span>${t(p.category)}</span></div>
    <div class="product-actions"><button class="btn gold small" ${p.stock<1?'disabled':''} onclick="addToCart('${p.id}')">${p.stock<1?(lang==='ar'?'نفد المخزون':'Out of stock'):t('addCart')}</button><button class="btn small" onclick="viewProduct('${p.id}')">⌕</button></div></div>
  </article>`).join('')||`<div class="empty" style="grid-column:1/-1">${lang==='ar'?'لا توجد نتائج':'No results'}</div>`;
}
function psFindVariant(p,size,color){
  const vs=p.variants||[];
  return vs.find(v=>(!size||v.size===size)&&(!color||v.color===color)&&v.stock>0)
    ||vs.find(v=>(!size||v.size===size)&&v.stock>0)
    ||vs.find(v=>(!color||v.color===color)&&v.stock>0)
    ||vs.find(v=>v.stock>0)||vs[0]||null;
}
function psSelectSize(id,size){
  const p=products.find(x=>x.id===id);if(!p)return;
  PS.selectedProduct=id;PS.selectedSize=size;
  const v=psFindVariant(p,size,PS.selectedColor);
  if(v)PS.selectedColor=v.color;
  psRefreshVariantUI(p);
}
function psSelectColor(id,color){
  const p=products.find(x=>x.id===id);if(!p)return;
  PS.selectedProduct=id;PS.selectedColor=color;
  const v=psFindVariant(p,PS.selectedSize,color);
  if(v)PS.selectedSize=v.size;
  psRefreshVariantUI(p);
}
function psRefreshVariantUI(p){
  const v=psFindVariant(p,PS.selectedSize,PS.selectedColor);
  if(v){PS.selectedSize=v.size;PS.selectedColor=v.color}
  document.querySelectorAll('[data-ps-size]').forEach(el=>el.classList.toggle('gold',el.dataset.psSize===PS.selectedSize));
  document.querySelectorAll('[data-ps-color]').forEach(el=>el.style.outline=el.dataset.psColor===PS.selectedColor?'2px solid #f2cf7b':'none');
  const st=document.getElementById('psVariantStock');if(st)st.textContent=String(v?.stock||0);
  const btn=document.getElementById('psAddBtn');if(btn){btn.disabled=!v||v.stock<1;btn.dataset.variant=v?.id||''}
}
function psGalleryShow(url){
  const img=document.getElementById('psGalleryMain');if(img)img.src=url;
  document.querySelectorAll('.ps-thumb').forEach(x=>x.style.borderColor=x.dataset.url===url?'#f2cf7b':'var(--line)');
}
function viewProduct(id){
  const p=products.find(x=>x.id===id);if(!p)return;
  const available=p.variants.filter(v=>v.stock>0);
  const first=available[0]||p.variants[0]||null;
  PS.selectedProduct=id;PS.selectedSize=first?.size||'';PS.selectedColor=first?.color||'';
  const images=psImages(p);
  const main=images[0]?.image_url||'';
  const sizes=[...new Set(p.variants.map(v=>v.size||'One Size'))];
  const colors=[...new Map(p.variants.map(v=>[v.color,v])).values()];
  showModal(`<div class="modal-head"><h3>${escapeHtml(p.name)}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="productdetail">
    <div><div style="width:100%;aspect-ratio:4/5;border:1px solid var(--line);border-radius:18px;background:#090705;display:grid;place-items:center;overflow:hidden">${main?`<img id="psGalleryMain" src="${escapeHtml(main)}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:contain">`:productSvg(p)}</div>
      ${images.length>1?`<div style="display:flex;gap:7px;overflow:auto;margin-top:8px">${images.map((im,i)=>`<button class="ps-thumb" data-url="${escapeHtml(im.image_url)}" onclick="psGalleryShow(this.dataset.url)" style="width:58px;min-width:58px;aspect-ratio:4/5;border:1px solid ${i===0?'#f2cf7b':'var(--line)'};border-radius:10px;background:#0b0907;padding:2px"><img src="${escapeHtml(im.image_url)}" style="width:100%;height:100%;object-fit:contain"></button>`).join('')}</div>`:''}
    </div>
    <div><div class="price"><strong style="font-size:25px">${money(finalPrice(p))}</strong>${p.discount?`<span class="old">${money(p.price)}</span>`:''}</div><p class="muted">SNB Leather Goods · SUBSTANCE • NUANCE • BRILLIANCE</p>
      <div class="field"><label>${t('size')}</label><div style="display:flex;gap:7px;flex-wrap:wrap">${sizes.map(s=>{const ok=p.variants.some(v=>v.size===s&&v.stock>0);return `<button data-ps-size="${escapeHtml(s)}" class="btn small ${s===PS.selectedSize?'gold':''}" ${ok?'':'disabled'} onclick="psSelectSize('${p.id}',this.dataset.psSize)">${escapeHtml(s)}</button>`}).join('')}</div></div>
      <div class="field"><label>${t('color')}</label><div style="display:flex;gap:9px;flex-wrap:wrap">${colors.map(v=>{const ok=p.variants.some(x=>x.color===v.color&&x.stock>0);return `<button data-ps-color="${escapeHtml(v.color)}" title="${escapeHtml(psColorLabel(v))}" ${ok?'':'disabled'} onclick="psSelectColor('${p.id}',this.dataset.psColor)" style="width:40px;height:40px;border-radius:50%;border:3px solid #211a12;background:${escapeHtml(v.color)};outline:${v.color===PS.selectedColor?'2px solid #f2cf7b':'none'};opacity:${ok?'1':'.25'}"></button>`}).join('')}</div><small class="muted">${escapeHtml(psColorLabel(first)||'')}</small></div>
      <p>${t('stock')}: <b id="psVariantStock">${first?.stock||0}</b></p>
      <button id="psAddBtn" data-variant="${first?.id||''}" class="btn gold" style="width:100%" ${first&&first.stock>0?'':'disabled'} onclick="addToCart('${p.id}',this.dataset.variant);closeOverlay()">${t('addCart')}</button>
    </div>
  </div>`);
}
(function psInit(){
  if(!document.getElementById('psStyle')){
    const s=document.createElement('style');s.id='psStyle';s.textContent='.snb-tag{font-size:9px;font-weight:900;border-radius:999px;padding:6px 8px;background:rgba(8,7,5,.9);border:1px solid var(--line);color:#f3d58c;white-space:nowrap}.snb-store-tools .field input,.snb-store-tools .field select{min-height:42px}button:disabled{opacity:.35;cursor:not-allowed}';document.head.appendChild(s);
  }
  setTimeout(()=>{psEnsureTools();loadProducts()},50);
})();
