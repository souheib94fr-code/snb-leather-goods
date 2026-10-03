// SNB Demo Card + Receipt v2
(function(){
  if(window.__SNB_STRIPE_V2__)return;
  window.__SNB_STRIPE_V2__=true;

  function ar(){return typeof lang!=='undefined'&&lang==='ar'}
  function txt(a,e){return ar()?a:e}
  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'')}

  function addCardOption(){
    var sel=document.getElementById('paymentMethod');if(!sel)return;
    var opt=[...sel.options].find(o=>o.value==='card');
    if(!opt){
      opt=document.createElement('option');
      opt.value='card';
      sel.appendChild(opt);
    }
    opt.textContent=txt('بطاقة بنكية','Card');
    sel.onchange=function(){
      if(typeof window.snbCheckoutPaymentChanged==='function')window.snbCheckoutPaymentChanged();
      renderCardFields();
    };
  }

  function renderCardFields(){
    var sel=document.getElementById('paymentMethod');
    var host=document.getElementById('snbPaymentHelp');
    if(!sel||!host||sel.value!=='card')return;
    host.innerHTML=
      '<div class="notice" style="border-color:rgba(215,168,78,.55)">'+
      '<b>💳 '+txt('الدفع بالبطاقة','Card payment')+'</b>'+
      '<p class="muted" style="margin:8px 0 0">'+txt('تجربة فقط — لا تدخل بيانات بطاقة حقيقية. هذه الحقول لا تُحفظ ولا تُرسل إلى السيرفر.','Demo only — do not enter real card details. These fields are not stored or sent to the server.')+'</p>'+
      '</div>'+
      '<div class="field"><label>'+txt('رقم البطاقة','Card number')+'</label><input id="snbDemoCardNo" inputmode="numeric" autocomplete="off" maxlength="19" placeholder="1234 5678 9012 3456"></div>'+
      '<div class="formgrid">'+
      '<div class="field"><label>'+txt('تاريخ الانتهاء','Expiry')+'</label><input id="snbDemoExpiry" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="MM/YY"></div>'+
      '<div class="field"><label>CVV</label><input id="snbDemoCvv" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="123"></div>'+
      '</div>';
  }

  var baseCheckout=window.checkout;
  if(typeof baseCheckout==='function'){
    window.checkout=async function(){
      await baseCheckout.apply(this,arguments);
      addCardOption();
      renderCardFields();
    };
  }

  async function newestCardOrder(){
    if(!currentUser)return null;
    var q=await sb.from('orders')
      .select('id,order_no,total,status,payment_method,payment_status,created_at,customer_name,email')
      .eq('user_id',currentUser.id)
      .eq('payment_method','card')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    return q.data||null;
  }

  function receiptNo(o){
    return 'RCP-'+new Date(o.created_at||Date.now()).getFullYear()+'-'+String(o.order_no||'SNB').replace(/^SNB-/,'').slice(0,8);
  }

  function receiptHtml(o){
    var r=receiptNo(o);
    return '<div id="snbDemoReceipt" style="width:min(390px,92vw);margin:auto;background:#fff;color:#111;border:2px solid #b88a22;border-radius:20px;padding:22px;font-family:Arial,Tahoma,sans-serif;box-sizing:border-box">'+
      '<div style="text-align:center"><div style="font-family:Georgia,serif;font-size:60px;line-height:.9;font-weight:800;color:#111">SNB</div><div style="letter-spacing:.24em;font-size:13px;margin-top:8px">LEATHER GOODS</div><div style="height:1px;background:#c79a37;margin:16px 0"></div>'+
      '<h2 style="margin:0;font-family:Georgia,serif">PAYMENT RECEIPT | إيصال استلام دفعة</h2>'+
      '<p style="margin:8px 0 18px;color:#6e6252">'+txt('نموذج تجريبي — لم يتم خصم أي مبلغ حقيقي.','Demo receipt — no real funds were charged.')+'</p></div>'+
      '<div style="display:grid;gap:12px;font-size:14px">'+
      row('Receipt No. | رقم الإيصال',r)+
      row('Order No. | رقم الطلب',o.order_no)+
      row('Date & Time | التاريخ والوقت',new Date(o.created_at||Date.now()).toLocaleString())+
      row('Customer | العميل',o.customer_name||currentUser?.name||'SNB Customer')+
      row('Payment Method | طريقة الدفع','Card | بطاقة بنكية')+
      '</div>'+
      '<div style="margin-top:18px;border:1px solid #c89a34;border-radius:14px;padding:16px;display:flex;justify-content:space-between;align-items:center;background:#fffaf0"><b>Amount | المبلغ</b><strong style="font-size:26px">AED '+Number(o.total||0).toFixed(2)+'</strong></div>'+
      '<div style="margin-top:14px;border-radius:14px;padding:14px;text-align:center;background:#eef7ea;border:1px solid #bad6b2"><b style="font-size:22px">DEMO ✓</b><br><span>'+txt('تمت محاكاة العملية بنجاح','Payment simulation completed successfully')+'</span></div>'+
      '<div style="text-align:center;margin-top:22px;padding-top:16px;border-top:1px solid #d6b667"><b>Thank you for choosing SNB</b><br><span>شكراً لاختياركم SNB</span><br><small style="color:#7b6b57">snbleathergoods.shop</small></div>'+
      '</div>';
  }

  function row(k,v){
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-bottom:10px;border-bottom:1px solid #eee1c5"><b>'+esc(k)+'</b><span style="text-align:right;word-break:break-word">'+esc(v)+'</span></div>';
  }

  async function pdfFromOrder(o){
    if(typeof html2canvas!=='function'||!window.jspdf?.jsPDF)throw new Error('PDF engine not ready');
    var box=document.createElement('div');
    box.style.position='fixed';box.style.left='-99999px';box.style.top='0';box.innerHTML=receiptHtml(o);
    document.body.appendChild(box);
    try{
      var node=box.firstElementChild;
      var canvas=await html2canvas(node,{scale:2,backgroundColor:'#ffffff',useCORS:true});
      var {jsPDF}=window.jspdf;
      var width=360;
      var height=width*(canvas.height/canvas.width);
      var pdf=new jsPDF({orientation:'portrait',unit:'pt',format:[width,height],compress:true});
      pdf.addImage(canvas.toDataURL('image/jpeg',0.94),'JPEG',0,0,width,height,undefined,'FAST');
      return pdf;
    }finally{box.remove()}
  }

  window.snbDownloadDemoReceipt=async function(orderNo){
    var o=await newestCardOrder();
    if(!o||o.order_no!==orderNo)return toast(txt('تعذر العثور على الطلب','Order not found'));
    try{var pdf=await pdfFromOrder(o);pdf.save(receiptNo(o)+'.pdf')}
    catch(e){console.error(e);toast(txt('تعذر إنشاء PDF','Could not create PDF'))}
  };

  window.snbEmailDemoReceipt=async function(orderNo){
    var o=await newestCardOrder();
    if(!o||o.order_no!==orderNo)return toast(txt('تعذر العثور على الطلب','Order not found'));
    try{
      var pdf=await pdfFromOrder(o);
      var b64=pdf.output('datauristring').split(',')[1];
      var res=await sb.functions.invoke('send-demo-receipt',{body:{order_id:o.id,pdf_base64:b64}});
      if(res.error||!res.data?.ok)throw new Error(res.data?.error||res.error?.message||'Email failed');
      toast(txt('تم إرسال الإيصال التجريبي للإيميل ✓','Demo receipt emailed ✓'));
    }catch(e){
      console.error(e);
      toast(txt('الإيصال جاهز للتحميل، لكن الإيميل ينتظر تفعيل دومين الإرسال.','Receipt is ready to download; email awaits sending-domain verification.'));
    }
  };

  function validateDemoFields(){
    var no=(document.getElementById('snbDemoCardNo')?.value||'').replace(/\D/g,'');
    var ex=document.getElementById('snbDemoExpiry')?.value||'';
    var cv=document.getElementById('snbDemoCvv')?.value||'';
    if(!/^\d{16}$/.test(no)){
      toast(txt('أدخل 16 رقم للبطاقة الوهمية.','Enter 16 digits for the dummy card.'));
      return false;
    }
    if(!/^\d{2}\/\d{2}$/.test(ex)){
      toast(txt('أدخل تاريخ انتهاء بصيغة MM/YY.','Enter expiry as MM/YY.'));
      return false;
    }
    if(!/^\d{3}$/.test(cv)){
      toast(txt('أدخل CVV وهمي من 3 أرقام.','Enter a 3-digit dummy CVV.'));
      return false;
    }
    return true;
  }

  var basePlaceOrder=window.placeOrder;
  if(typeof basePlaceOrder==='function'){
    window.placeOrder=async function(){
      var method=document.getElementById('paymentMethod')?.value||'cash_on_delivery';
      if(method==='card'&&!validateDemoFields())return;
      await basePlaceOrder.apply(this,arguments);
      if(method!=='card')return;
      var o=await newestCardOrder();
      if(!o)return toast(txt('تم إنشاء الطلب لكن تعذر فتح الإيصال','Order created, but receipt could not be opened'));
      showModal(
        '<div style="text-align:center"><div class="check" style="margin:auto">✓</div><h3>'+txt('تمت المحاكاة بنجاح','Simulation successful')+'</h3></div>'+
        receiptHtml(o)+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">'+
        '<button class="btn gold" onclick="snbDownloadDemoReceipt(\''+esc(o.order_no)+'\')">⬇ PDF</button>'+
        '<button class="btn" onclick="snbEmailDemoReceipt(\''+esc(o.order_no)+'\')">✉ Email</button>'+
        '</div>'+
        '<div class="notice" style="margin-top:10px">'+txt('هذه عملية تجريبية فقط والطلب يبقى غير مدفوع فعلياً.','This is a demo only; the order remains unpaid in the real payment system.')+'</div>'
      );
    };
  }
})();