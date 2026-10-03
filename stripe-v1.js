// SNB Stripe Test Mode v1
(function(){
  if(window.__SNB_STRIPE_V1__)return;
  window.__SNB_STRIPE_V1__=true;

  function ar(){return typeof lang!=='undefined'&&lang==='ar'}
  function txt(a,e){return ar()?a:e}

  function addCardOption(){
    var sel=document.getElementById('paymentMethod');if(!sel)return;
    if(![...sel.options].some(o=>o.value==='card')){
      var opt=document.createElement('option');
      opt.value='card';opt.textContent=txt('بطاقة بنكية — Test Mode','Card — Test Mode');
      sel.appendChild(opt);
    }
  }

  var baseCheckout=window.checkout;
  if(typeof baseCheckout==='function'){
    window.checkout=async function(){
      await baseCheckout.apply(this,arguments);
      addCardOption();
    };
  }

  async function newestCardOrder(){
    if(!currentUser)return null;
    var q=await sb.from('orders')
      .select('id,order_no,total,status,payment_method,payment_status,invoice_no,invoice_sent_at,created_at')
      .eq('user_id',currentUser.id)
      .eq('payment_method','card')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    return q.data||null;
  }

  async function startStripe(orderNo){
    var res=await sb.functions.invoke('create-stripe-checkout',{body:{order_no:orderNo}});
    if(res.error||!res.data?.url){
      var m=res.data?.error||res.error?.message||txt('تعذر بدء Stripe Test Mode','Could not start Stripe Test Mode');
      toast(m);return false;
    }
    location.href=res.data.url;
    return true;
  }
  window.snbStartStripeCheckout=startStripe;

  var basePlaceOrder=window.placeOrder;
  if(typeof basePlaceOrder==='function'){
    window.placeOrder=async function(){
      var method=document.getElementById('paymentMethod')?.value||'cash_on_delivery';
      await basePlaceOrder.apply(this,arguments);
      if(method!=='card')return;
      var o=await newestCardOrder();
      if(!o)return toast(txt('تم إنشاء الطلب لكن تعذر فتح الدفع','Order created, but payment could not be opened'));
      showModal('<div class="success" style="display:block;text-align:center"><div class="check">💳</div><h3>'+txt('جارٍ فتح الدفع الآمن','Opening secure payment')+'</h3><p>'+o.order_no+' · '+money(o.total)+'</p><p class="muted">'+txt('Stripe Test Mode — لا يتم سحب أموال حقيقية.','Stripe Test Mode — no real money is charged.')+'</p></div>');
      await startStripe(o.order_no);
    };
  }

  async function finishStripeReturn(){
    var u=new URL(location.href);
    var state=u.searchParams.get('stripe'),orderNo=u.searchParams.get('order');
    if(!state||!orderNo)return;
    history.replaceState({},'',location.pathname+location.hash);

    if(state==='cancel'){
      setTimeout(()=>showModal('<div class="success" style="display:block;text-align:center"><div class="check">×</div><h3>'+txt('تم إلغاء الدفع','Payment cancelled')+'</h3><p>'+orderNo+'</p><p class="muted">'+txt('طلبك محفوظ ولم يتم خصم أي مبلغ.','Your order is saved and no payment was charged.')+'</p></div>'),300);
      return;
    }

    setTimeout(()=>showModal('<div class="success" style="display:block;text-align:center"><div class="check">⌛</div><h3>'+txt('جارٍ تأكيد الدفع','Confirming payment')+'</h3><p>'+orderNo+'</p><p class="muted">'+txt('ننتظر تأكيد Stripe الآمن…','Waiting for secure Stripe confirmation…')+'</p></div>'),250);

    var paid=null;
    for(var i=0;i<12;i++){
      await new Promise(r=>setTimeout(r,i?1500:500));
      var q=await sb.from('orders').select('id,order_no,total,status,payment_status,invoice_no,invoice_sent_at').eq('order_no',orderNo).maybeSingle();
      if(q.data?.payment_status==='paid'){paid=q.data;break}
    }
    if(!paid){
      showModal('<div class="success" style="display:block;text-align:center"><div class="check">⌛</div><h3>'+txt('الدفع قيد التأكيد','Payment is processing')+'</h3><p>'+orderNo+'</p><p class="muted">'+txt('حدّث طلباتك بعد قليل.','Refresh your orders shortly.')+'</p></div>');
      return;
    }

    showModal('<div class="success" style="display:block;text-align:center"><div class="check">✓</div><h3>'+txt('تم الدفع بنجاح','Payment successful')+'</h3><p>'+orderNo+'</p><p style="color:#f2cf7b;font-size:22px"><b>'+money(paid.total)+'</b></p>'+(paid.invoice_no?'<p>'+txt('الفاتورة: ','Invoice: ')+paid.invoice_no+'</p>':'')+'<p class="muted">'+txt('تم تأكيد الدفع تلقائياً من Stripe.','Payment was confirmed automatically by Stripe.')+'</p></div>');

    try{
      if(paid.invoice_no&&!paid.invoice_sent_at&&typeof snbEmailInvoice==='function'){
        await snbEmailInvoice(paid.id);
      }
    }catch(e){console.error('invoice email after stripe',e)}
  }

  window.addEventListener('load',function(){setTimeout(finishStripeReturn,500)});
})();