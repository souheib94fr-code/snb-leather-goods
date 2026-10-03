// SNB Payments Layer v1 — Bank Transfer + Cash on Delivery
(function(){
  if(window.__SNB_PAYMENTS_V1__) return;
  window.__SNB_PAYMENTS_V1__=true;

  var PS={settings:null};

  function isAr(){return typeof lang!=='undefined'&&lang==='ar'}
  function payText(ar,en){return isAr()?ar:en}
  function payEscape(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function formatIban(v){return String(v||'').replace(/\s+/g,'').replace(/(.{4})/g,'$1 ').trim()}
  function bankReady(s){return !!(s&&s.bank_transfer_enabled&&String(s.bank_name||'').trim()&&String(s.account_name||'').trim()&&String(s.iban||'').trim())}
  function paymentMethodLabel(m){
    if(m==='bank_transfer')return payText('تحويل بنكي','Bank transfer');
    if(m==='cash_on_delivery')return payText('الدفع عند الاستلام','Cash on delivery');
    return m||'—';
  }
  function paymentStatusLabel(s){
    var a={
      pending_transfer:['بانتظار التحويل','Awaiting bank transfer'],
      transfer_submitted:['التحويل مُرسل للمراجعة','Transfer submitted'],
      paid:['مدفوع','Paid'],
      cod_due:['الدفع عند الاستلام','Due on delivery'],
      cod_collected:['تم تحصيل الكاش','Cash collected'],
      cancelled:['ملغى','Cancelled']
    };
    return a[s]?payText(a[s][0],a[s][1]):s||'—';
  }
  function statusClass(s){return ['paid','cod_collected'].includes(s)?'ok':(s==='cancelled'?'warn':'warn')}

  async function loadSettings(force){
    if(PS.settings&&!force)return PS.settings;
    var r=await sb.from('payment_settings').select('*').eq('id',1).maybeSingle();
    if(r.error){console.error('payment_settings',r.error);PS.settings={cod_enabled:true,bank_transfer_enabled:false};return PS.settings}
    PS.settings=r.data||{cod_enabled:true,bank_transfer_enabled:false};
    return PS.settings;
  }
  window.snbLoadPaymentSettings=loadSettings;

  window.snbCopyIban=async function(){
    var iban=String(PS.settings?.iban||'').replace(/\s+/g,'');
    if(!iban)return;
    try{await navigator.clipboard.writeText(iban);toast(payText('تم نسخ IBAN ✓','IBAN copied ✓'))}
    catch(e){window.prompt(payText('انسخ الـ IBAN','Copy IBAN'),iban)}
  };

  function bankDetailsHtml(order,showReference){
    var s=PS.settings||{};
    if(!bankReady(s))return '<div class="notice">'+payText('بيانات التحويل البنكي غير مفعّلة بعد.','Bank transfer details are not active yet.')+'</div>';
    var ref=order?.payment_reference||'';
    var orderNo=order?.order_no||'';
    var total=order?.total;
    return '<div class="notice" style="border-color:rgba(215,168,78,.55)">'+
      '<b>🏦 '+payText('بيانات التحويل البنكي','Bank transfer details')+'</b>'+
      '<div style="display:grid;gap:8px;margin-top:10px">'+
      '<div><small class="muted">'+payText('اسم البنك','Bank')+'</small><br><b>'+payEscape(s.bank_name)+'</b></div>'+
      '<div><small class="muted">'+payText('اسم المستفيد','Beneficiary')+'</small><br><b>'+payEscape(s.account_name)+'</b></div>'+
      '<div><small class="muted">IBAN</small><br><b dir="ltr" style="word-break:break-all">'+payEscape(formatIban(s.iban))+'</b> <button class="btn small" type="button" onclick="snbCopyIban()">Copy</button></div>'+
      (s.swift_bic?'<div><small class="muted">SWIFT / BIC</small><br><b>'+payEscape(s.swift_bic)+'</b></div>':'')+
      (orderNo?'<div><small class="muted">'+payText('مرجع الطلب الذي تكتبه في التحويل','Order reference to include in transfer')+'</small><br><b>'+payEscape(orderNo)+'</b></div>':'')+
      (total!=null?'<div><small class="muted">'+payText('المبلغ المطلوب','Amount due')+'</small><br><b style="color:#f2cf7b;font-size:20px">'+money(total)+'</b></div>':'')+
      (s.instructions?'<div><small class="muted">'+payText('تعليمات','Instructions')+'</small><br>'+payEscape(s.instructions)+'</div>':'')+
      '</div></div>'+
      (showReference&&orderNo&&order?.payment_status!=='paid'&&order?.status!=='cancelled'?
        '<div class="field"><label>'+payText('بعد التحويل، أدخل رقم/مرجع العملية','After transfer, enter transaction reference')+'</label><input id="snbBankRef" value="'+payEscape(ref)+'" placeholder="Bank reference"></div>'+
        '<button class="btn gold" style="width:100%" onclick="snbSubmitBankReference(\''+payEscape(orderNo)+'\')">'+payText('تم التحويل — إرسال المرجع','I transferred — Submit reference')+'</button>'
      :'');
  }

  window.snbSubmitBankReference=async function(orderNo){
    var ref=document.getElementById('snbBankRef')?.value.trim()||'';
    if(ref.length<3)return toast(payText('أدخل مرجع التحويل','Enter the transfer reference'));
    var r=await sb.rpc('submit_bank_transfer_reference',{p_order_no:orderNo,p_reference:ref});
    if(r.error)return toast(r.error.message||'Could not submit reference');
    toast(payText('تم إرسال مرجع التحويل للإدارة ✓','Transfer reference sent to admin ✓'));
    await loadMyOrders();
    var idx=(myOrders||[]).findIndex(function(o){return o.order_no===orderNo});
    if(idx>=0)openOrderDetails(idx);
  };

  // Enrich customer orders with payment fields.
  var baseLoadMyOrders=window.loadMyOrders;
  if(typeof baseLoadMyOrders==='function'){
    window.loadMyOrders=async function(){
      await baseLoadMyOrders.apply(this,arguments);
      if(!currentUser)return;
      var r=await sb.from('orders').select('id,payment_status,payment_reference,payment_confirmed_at').eq('user_id',currentUser.id);
      if(r.error)return;
      var byId={};(r.data||[]).forEach(function(x){byId[x.id]=x});
      (myOrders||[]).forEach(function(o){if(byId[o.id])Object.assign(o,byId[o.id])});
    };
  }

  // Checkout: keep only COD and configured bank transfer.
  var baseCheckout=window.checkout;
  if(typeof baseCheckout==='function'){
    window.checkout=async function(){
      await baseCheckout.apply(this,arguments);
      var sel=document.getElementById('paymentMethod');
      if(!sel)return;
      var s=await loadSettings();
      var opts=[];
      if(s.cod_enabled)opts.push('<option value="cash_on_delivery">'+payText('الدفع عند الاستلام','Cash on delivery')+'</option>');
      if(bankReady(s))opts.push('<option value="bank_transfer">'+payText('تحويل بنكي','Bank transfer')+'</option>');
      sel.innerHTML=opts.join('');
      sel.onchange=window.snbCheckoutPaymentChanged;
      if(!document.getElementById('snbPaymentHelp'))sel.closest('.field')?.insertAdjacentHTML('afterend','<div id="snbPaymentHelp"></div>');
      var place=document.getElementById('placeOrderBtn');
      if(!opts.length&&place){
        place.disabled=true;
        document.getElementById('snbPaymentHelp').innerHTML='<div class="notice">'+payText('لا توجد طريقة دفع مفعّلة حالياً.','No payment method is enabled currently.')+'</div>';
      }else{
        window.snbCheckoutPaymentChanged();
      }
    };
  }

  window.snbCheckoutPaymentChanged=function(){
    var box=document.getElementById('snbPaymentHelp'),sel=document.getElementById('paymentMethod');
    if(!box||!sel)return;
    if(sel.value==='bank_transfer'){
      box.innerHTML=bankDetailsHtml(null,false)+'<div class="notice">'+payText('بعد إنشاء الطلب سيظهر رقم الطلب والمبلغ. لا يتم تجهيز الطلب قبل تأكيد وصول التحويل من الإدارة.','After placing the order, the order number and amount will appear. The order is not prepared until the transfer is confirmed by admin.')+'</div>';
    }else{
      box.innerHTML='<div class="notice">💵 '+payText('تدفع المبلغ عند استلام الطلب.','Pay the order amount when it is delivered.')+'</div>';
    }
  };

  // After a bank-transfer order is created, immediately show payment instructions.
  var basePlaceOrder=window.placeOrder;
  if(typeof basePlaceOrder==='function'){
    window.placeOrder=async function(){
      var method=document.getElementById('paymentMethod')?.value||'cash_on_delivery';
      var before=(myOrders&&myOrders[0])?myOrders[0].order_no:null;
      await basePlaceOrder.apply(this,arguments);
      if(method!=='bank_transfer')return;
      await loadSettings(true);
      await loadMyOrders();
      var o=(myOrders||[]).find(function(x){return x.order_no!==before&&x.payment_method==='bank_transfer'})||(myOrders||[]).find(function(x){return x.payment_method==='bank_transfer'});
      if(!o)return;
      showModal('<div class="success" style="display:block;text-align:center">'+
        '<div class="check">✓</div><h3>'+payText('تم إنشاء الطلب','Order created')+'</h3>'+
        '<p>'+t('orderNo')+': <b>'+payEscape(o.order_no)+'</b></p>'+
        bankDetailsHtml(o,true)+
        '<p class="muted">'+payText('يمكنك أيضاً إرسال مرجع التحويل لاحقاً من تفاصيل الطلب في حسابك.','You can also submit the transfer reference later from your order details.')+'</p>'+
        '<button class="btn" onclick="closeOverlay();renderAccount()">'+payText('الذهاب لطلباتي','Go to my orders')+'</button></div>');
    };
  }

  // Add payment details to order details.
  var baseOpenOrderDetails=window.openOrderDetails;
  if(typeof baseOpenOrderDetails==='function'){
    window.openOrderDetails=function(index){
      baseOpenOrderDetails.apply(this,arguments);
      var o=(myOrders||[])[index];if(!o)return;
      loadSettings().then(function(){
        var modal=document.querySelector('#overlay .modal');
        if(!modal||modal.querySelector('#snbOrderPayment'))return;
        var html='<div id="snbOrderPayment" style="margin-top:14px"><h4>'+payText('الدفع','Payment')+'</h4>'+
          '<div class="notice"><b>'+payEscape(paymentMethodLabel(o.payment_method))+'</b><br><span class="status '+statusClass(o.payment_status)+'" style="margin-top:7px">'+payEscape(paymentStatusLabel(o.payment_status))+'</span>'+
          (o.payment_reference?'<br><small class="muted">'+payText('مرجع التحويل: ','Transfer reference: ')+payEscape(o.payment_reference)+'</small>':'')+'</div>'+
          (o.payment_method==='bank_transfer'&&o.payment_status!=='paid'&&o.status!=='cancelled'?bankDetailsHtml(o,true):'')+
          '</div>';
        modal.insertAdjacentHTML('beforeend',html);
      });
    };
  }

  // Admin data: load payment settings too.
  var baseLoadAdminData=window.loadAdminData;
  if(typeof baseLoadAdminData==='function'){
    window.loadAdminData=async function(){
      await baseLoadAdminData.apply(this,arguments);
      await loadSettings(true);
    };
  }

  function addAdminPaymentsButton(tab){
    var side=document.querySelector('#adminApp .sidebar');if(!side||side.querySelector('[data-snb-payments]'))return;
    var b=document.createElement('button');
    b.className='btn '+(tab==='payments'?'gold':'');
    b.setAttribute('data-snb-payments','1');
    b.innerHTML='💳 '+payText('الدفع','Payments');
    b.onclick=function(){renderAdminReplace('payments')};
    var ship=[...side.querySelectorAll('button')].find(function(x){return String(x.getAttribute('onclick')||'').includes("'shipping'")});
    if(ship)ship.insertAdjacentElement('afterend',b);else side.appendChild(b);
  }

  function renderPaymentsAdmin(){
    var el=document.getElementById('adminMain');if(!el)return;
    var s=PS.settings||{};
    el.innerHTML='<div class="section-head"><div><h3>💳 '+payText('إعدادات الدفع','Payment Settings')+'</h3><span>'+payText('تحويل بنكي + كاش عند الاستلام','Bank transfer + Cash on delivery')+'</span></div></div>'+
      '<div class="notice">'+payText('اسم صاحب الحساب يبقى داخلياً ولا يظهر للعملاء. العميل يرى البنك وIBAN وSWIFT فقط. لا تحفظ أي رقم بطاقة أو CVV هنا.','The account holder name stays internal and is hidden from customers. Customers only see bank, IBAN and SWIFT. Never store card numbers or CVV here.')+'</div>'+
      '<div class="formgrid">'+
      '<div class="field"><label>'+payText('الدفع عند الاستلام','Cash on delivery')+'</label><select id="payCod"><option value="1" '+(s.cod_enabled?'selected':'')+'>'+payText('مفعّل','Enabled')+'</option><option value="0" '+(!s.cod_enabled?'selected':'')+'>'+payText('موقوف','Disabled')+'</option></select></div>'+
      '<div class="field"><label>'+payText('التحويل البنكي','Bank transfer')+'</label><select id="payBank"><option value="1" '+(s.bank_transfer_enabled?'selected':'')+'>'+payText('مفعّل','Enabled')+'</option><option value="0" '+(!s.bank_transfer_enabled?'selected':'')+'>'+payText('موقوف','Disabled')+'</option></select></div>'+
      '<div class="field"><label>'+payText('اسم البنك','Bank name')+'</label><input id="payBankName" value="'+payEscape(s.bank_name||'')+'"></div>'+
      '<div class="field"><label>'+payText('اسم صاحب الحساب — داخلي ولن يظهر للعملاء','Account holder name — internal, hidden from customers')+'</label><input id="payAccountName" value="'+payEscape(s.account_name||'')+'"></div>'+
      '<div class="field"><label>IBAN</label><input id="payIban" dir="ltr" value="'+payEscape(s.iban||'')+'" placeholder="AE..."></div>'+
      '<div class="field"><label>SWIFT / BIC</label><input id="paySwift" dir="ltr" value="'+payEscape(s.swift_bic||'')+'"></div>'+
      '</div>'+
      '<div class="field"><label>'+payText('تعليمات إضافية للعميل','Extra customer instructions')+'</label><textarea id="payInstructions" rows="3">'+payEscape(s.instructions||'')+'</textarea></div>'+
      '<button class="btn gold" onclick="snbSavePaymentSettings()">'+payText('حفظ إعدادات الدفع','Save payment settings')+'</button>'+
      (bankReady(s)?'<div class="notice" style="margin-top:12px;border-color:rgba(88,183,122,.45)">✓ '+payText('التحويل البنكي جاهز للظهور في Checkout.','Bank transfer is ready to appear at checkout.')+'</div>':'<div class="notice" style="margin-top:12px">⚠ '+payText('لن يظهر التحويل البنكي للعميل حتى تدخل اسم البنك + اسم المستفيد + IBAN وتفعّله.','Bank transfer stays hidden until bank name, beneficiary name and IBAN are entered and enabled.')+'</div>');
  }

  window.snbSavePaymentSettings=async function(){
    var cod=document.getElementById('payCod')?.value==='1';
    var bank=document.getElementById('payBank')?.value==='1';
    var bankName=document.getElementById('payBankName')?.value.trim()||'';
    var accountName=document.getElementById('payAccountName')?.value.trim()||'';
    var iban=(document.getElementById('payIban')?.value||'').replace(/\s+/g,'').toUpperCase();
    var swift=(document.getElementById('paySwift')?.value||'').replace(/\s+/g,'').toUpperCase();
    var instructions=document.getElementById('payInstructions')?.value.trim()||'';
    if(bank&&(!bankName||!accountName||iban.length<15))return toast(payText('أكمل اسم البنك واسم المستفيد وIBAN صحيح قبل التفعيل.','Complete bank name, beneficiary and a valid IBAN before enabling.'));
    var obj={cod_enabled:cod,bank_transfer_enabled:bank,bank_name:bankName||null,account_name:accountName||null,iban:iban||null,swift_bic:swift||null,instructions:instructions||null,updated_at:new Date().toISOString()};
    var r=await sb.from('payment_settings').update(obj).eq('id',1);
    if(r.error)return toast(r.error.message||'Could not save payment settings');
    await loadSettings(true);
    toast(payText('تم حفظ إعدادات الدفع ✓','Payment settings saved ✓'));
    renderAdminReplace('payments');
  };

  function adminPaymentCell(o){
    var html='<b>'+payEscape(paymentMethodLabel(o.payment_method))+'</b><br><span class="status '+statusClass(o.payment_status)+'">'+payEscape(paymentStatusLabel(o.payment_status))+'</span>';
    if(o.payment_reference)html+='<br><small class="muted">'+payText('مرجع: ','Ref: ')+payEscape(o.payment_reference)+'</small>';
    if(o.payment_method==='bank_transfer'&&o.payment_status!=='paid'&&o.payment_status!=='cancelled'){
      html+='<br><button class="btn gold small" style="margin-top:6px" onclick="snbAdminConfirmPayment(\''+o.id+'\')">'+payText('تأكيد وصول التحويل','Confirm bank payment')+'</button>';
    }else if(o.payment_method==='cash_on_delivery'&&o.payment_status==='cod_due'&&o.status!=='cancelled'){
      html+='<br><button class="btn small" style="margin-top:6px" onclick="snbAdminConfirmPayment(\''+o.id+'\')">'+payText('تم تحصيل الكاش','Mark cash collected')+'</button>';
    }
    return html;
  }

  function enhanceAdminOrders(){
    var table=document.querySelector('#adminMain table');if(!table||table.dataset.snbPaymentsEnhanced)return;
    table.dataset.snbPaymentsEnhanced='1';
    var hr=table.querySelector('thead tr');if(hr)hr.insertAdjacentHTML('beforeend','<th>'+payText('الدفع','Payment')+'</th>');
    var rows=[...table.querySelectorAll('tbody tr')];
    if(!orders?.length)return;
    rows.forEach(function(tr,i){var o=orders[i];if(o)tr.insertAdjacentHTML('beforeend','<td>'+adminPaymentCell(o)+'</td>')});
    table.style.minWidth='1700px';
  }

  window.snbAdminConfirmPayment=async function(id){
    var o=(orders||[]).find(function(x){return x.id===id});
    if(!o)return;
    var msg=o.payment_method==='bank_transfer'
      ?payText('تأكيد أنك راجعت البنك ووصل المبلغ فعلياً؟','Confirm you checked the bank and the money was actually received?')
      :payText('تأكيد أنك استلمت المبلغ كاش؟','Confirm cash was collected?');
    if(!confirm(msg))return;
    var r=await sb.rpc('admin_confirm_order_payment',{p_order_id:id});
    if(r.error)return toast(r.error.message||'Could not confirm payment');
    await loadAdminData();
    toast(payText('تم تأكيد الدفع ✓','Payment confirmed ✓'));
    renderAdminReplace('orders');
    var updated=(orders||[]).find(function(x){return x.id===id});
    if(updated?.invoice_no&&typeof snbEmailInvoice==='function'){
      try{await snbEmailInvoice(id)}catch(e){console.error(e)}
    }
  };

  var baseRenderAdmin=window.renderAdmin;
  if(typeof baseRenderAdmin==='function'){
    window.renderAdmin=function(tab){
      tab=tab||'dashboard';
      baseRenderAdmin.call(this,tab);
      addAdminPaymentsButton(tab);
      if(tab==='payments')renderPaymentsAdmin();
      if(tab==='orders')enhanceAdminOrders();
    };
    window.renderAdminReplace=function(tab){
      document.getElementById('adminApp')?.remove();
      window.renderAdmin(tab);
    };
  }

  // Re-enhance account modal so payment badges are visible at a glance.
  var baseRenderAccount=window.renderAccount;
  if(typeof baseRenderAccount==='function'){
    window.renderAccount=async function(){
      await baseRenderAccount.apply(this,arguments);
      var box=document.getElementById('accountOrders');
      if(!box)return;
      var cards=[...box.children];
      cards.forEach(function(card,i){
        var o=(myOrders||[])[i];if(!o||card.querySelector('.snb-pay-badge'))return;
        var badge=document.createElement('div');
        badge.className='snb-pay-badge';
        badge.style.margin='8px 0';
        badge.innerHTML='<span class="status '+statusClass(o.payment_status)+'">'+payEscape(paymentStatusLabel(o.payment_status))+'</span> · <small class="muted">'+payEscape(paymentMethodLabel(o.payment_method))+'</small>';
        card.insertBefore(badge,card.lastElementChild);
      });
    };
  }
})();