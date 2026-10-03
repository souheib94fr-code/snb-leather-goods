// SNB Electronic Invoice Layer v1
(function(){
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(v??''):String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  const cash=v=>typeof money==='function'?money(Number(v||0)):`AED ${Number(v||0).toFixed(2)}`;
  const items=o=>Array.isArray(o?.order_items)?o.order_items:(Array.isArray(o?.items)?o.items:[]);
  const issued=o=>!!o?.invoice_no && o.status!=='cancelled';
  const date=v=>v?new Date(v).toLocaleString():'—';
  const payLabel=v=>({cash_on_delivery:'Cash on Delivery / الدفع عند الاستلام',bank_transfer:'Bank Transfer / تحويل بنكي',whatsapp:'WhatsApp'})[v]||v||'—';

  function paper(o){
    const rows=items(o).map(i=>`
      <tr>
        <td><b>${esc(i.product_name||'Product')}</b><div class="iv-muted">${esc([i.size,i.color_name||i.color].filter(Boolean).join(' · '))}</div></td>
        <td class="iv-num">${Number(i.qty||0)}</td>
        <td class="iv-num">${cash(i.unit_price||0)}</td>
        <td class="iv-num"><b>${cash(Number(i.unit_price||0)*Number(i.qty||0))}</b></td>
      </tr>`).join('');
    const productDiscount=Number(o.discount_amount||0);
    const couponDiscount=Number(o.coupon_discount||0);
    return `
    <div class="snb-invoice-paper" dir="ltr">
      <style>
        .snb-invoice-paper{width:794px;box-sizing:border-box;background:#fff;color:#17130e;padding:46px;font-family:Arial,"Noto Sans Arabic",Tahoma,sans-serif;line-height:1.45}
        .iv-head{display:flex;justify-content:space-between;gap:30px;align-items:flex-start;border-bottom:3px solid #b98936;padding-bottom:22px;margin-bottom:26px}
        .iv-brand{font-family:Georgia,serif;font-size:28px;letter-spacing:.08em;color:#1b1711}.iv-brand small{display:block;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.18em;color:#9b762e;margin-top:5px}
        .iv-title{text-align:right}.iv-title h1{font:700 30px Georgia,serif;margin:0;color:#b07d25}.iv-title div{font-size:13px;margin-top:5px}
        .iv-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px}.iv-box{border:1px solid #ded7ca;border-radius:12px;padding:14px}.iv-box h3{margin:0 0 8px;color:#9c6c20;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
        .iv-ar{direction:rtl;text-align:right}.iv-muted{color:#756c61;font-size:11px;margin-top:3px}
        .iv-table{width:100%;border-collapse:collapse;margin-top:10px}.iv-table th{background:#17130e;color:#f0ca77;text-align:left;padding:10px;font-size:11px;text-transform:uppercase}.iv-table td{padding:11px 10px;border-bottom:1px solid #e8e1d6;font-size:12px}.iv-num{text-align:right!important;white-space:nowrap}
        .iv-totals{width:330px;margin:22px 0 0 auto}.iv-totalrow{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #ece5d9;font-size:12px}.iv-totalrow.final{font-size:18px;font-weight:800;border-top:2px solid #b98936;border-bottom:0;padding-top:12px;color:#17130e}
        .iv-foot{margin-top:34px;padding-top:18px;border-top:1px solid #ded7ca;text-align:center;color:#756c61;font-size:10px}.iv-foot b{color:#9c6c20}
      </style>
      <div class="iv-head">
        <div>
          <div class="iv-brand">SNB LEATHER GOODS<small>SUBSTANCE · NUANCE · BRILLIANCE</small></div>
          <div class="iv-muted" style="margin-top:12px">Dubai, United Arab Emirates</div>
        </div>
        <div class="iv-title">
          <h1>INVOICE</h1>
          <div dir="rtl">فاتورة إلكترونية</div>
          <div><b>${esc(o.invoice_no||'PENDING')}</b></div>
          <div class="iv-muted">Issued: ${esc(date(o.invoice_issued_at||o.updated_at||o.created_at))}</div>
        </div>
      </div>
      <div class="iv-grid">
        <div class="iv-box">
          <h3>Bill To / العميل</h3>
          <b>${esc(o.customer_name||o.customer||currentUser?.name||'Customer')}</b>
          <div>${esc(o.email||currentUser?.email||'')}</div>
          <div>${esc(o.mobile||currentUser?.mobile||'')}</div>
          <div class="iv-muted">${esc([o.emirate,o.city,o.address].filter(Boolean).join(' · '))}</div>
        </div>
        <div class="iv-box iv-ar">
          <h3>Order / الطلب</h3>
          <div><b>${esc(o.order_no||'')}</b></div>
          <div>تاريخ الطلب: ${esc(date(o.created_at))}</div>
          <div>طريقة الدفع: ${esc(payLabel(o.payment_method))}</div>
          <div class="iv-muted">Status: ${esc(typeof statusLabel==='function'?statusLabel(o.status):o.status)}</div>
        </div>
      </div>
      <table class="iv-table">
        <thead><tr><th>Item / المنتج</th><th class="iv-num">Qty</th><th class="iv-num">Unit</th><th class="iv-num">Total</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="4">No items</td></tr>'}</tbody>
      </table>
      <div class="iv-totals">
        <div class="iv-totalrow"><span>Subtotal / المجموع</span><span>${cash(o.subtotal||0)}</span></div>
        ${productDiscount>0?`<div class="iv-totalrow"><span>Product discount / خصم</span><span>− ${cash(productDiscount)}</span></div>`:''}
        ${couponDiscount>0?`<div class="iv-totalrow"><span>Coupon ${esc(o.coupon_code||'')}</span><span>− ${cash(couponDiscount)}</span></div>`:''}
        <div class="iv-totalrow"><span>Shipping / الشحن</span><span>${cash(o.shipping_fee||0)}</span></div>
        <div class="iv-totalrow final"><span>TOTAL / الإجمالي</span><span>${cash(o.total||0)}</span></div>
      </div>
      <div class="iv-foot">
        <b>SNB Leather Goods</b> · Electronic invoice generated from the official SNB order record.<br>
        هذه الفاتورة الإلكترونية مرتبطة مباشرة بسجل الطلب في متجر SNB Leather Goods.
      </div>
    </div>`;
  }

  function ensureIssued(o){
    if(!o)return false;
    if(o.status==='cancelled'){toast(lang==='ar'?'الطلب ملغى ولا توجد فاتورة فعالة':'Cancelled order has no active invoice');return false}
    if(!o.invoice_no){toast(lang==='ar'?'تُصدر الفاتورة بعد تأكيد الطلب':'Invoice is issued after order confirmation');return false}
    return true;
  }

  function openInvoice(o){
    if(!ensureIssued(o))return;
    showModal(`<div class="modal-head"><h3>${lang==='ar'?'الفاتورة الإلكترونية':'Electronic Invoice'} · ${esc(o.invoice_no)}</h3><button class="iconbtn close" onclick="closeOverlay()">✕</button></div>
      <div style="overflow:auto;border-radius:14px;background:#eee;padding:8px;max-height:65vh"><div style="transform-origin:top left;min-width:794px">${paper(o)}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn gold" onclick="snbDownloadInvoicePdf('${esc(o.id)}')">⬇ PDF</button>
        <button class="btn" onclick="snbPrintInvoice('${esc(o.id)}')">🖨 ${lang==='ar'?'طباعة':'Print'}</button>
        <button class="btn" onclick="snbEmailInvoice('${esc(o.id)}')">✉ ${lang==='ar'?'إرسال للإيميل':'Email invoice'}</button>
      </div>`);
  }

  function adminOrders(){return typeof orders!=='undefined'&&Array.isArray(orders)?orders:[]}
  function customerOrders(){return typeof myOrders!=='undefined'&&Array.isArray(myOrders)?myOrders:[]}
  function allOrders(){return [...adminOrders(),...customerOrders()]}
  function byId(id){return allOrders().find(o=>String(o.id)===String(id))||null}

  function printInvoice(o){
    if(!ensureIssued(o))return;
    const w=window.open('','_blank','noopener,noreferrer');
    if(!w)return toast(lang==='ar'?'اسمح بفتح النوافذ للطباعة':'Allow pop-ups to print');
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.invoice_no)}</title><style>@page{size:A4;margin:0}body{margin:0;background:#fff}.snb-invoice-paper{margin:0 auto}</style></head><body>${paper(o)}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    w.document.close();
  }

  async function pdfDoc(o){
    if(!ensureIssued(o))return null;
    if(typeof html2canvas!=='function'||!window.jspdf?.jsPDF)throw new Error('PDF engine is not ready');
    const holder=document.createElement('div');
    holder.style='position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1';
    holder.innerHTML=paper(o);
    document.body.appendChild(holder);
    try{
      const canvas=await html2canvas(holder.firstElementChild,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4',compress:true});
      const pw=pdf.internal.pageSize.getWidth(),ph=pdf.internal.pageSize.getHeight();
      const iw=pw,ih=canvas.height*pw/canvas.width;
      const img=canvas.toDataURL('image/jpeg',0.94);
      let offset=0,page=0;
      do{
        if(page>0)pdf.addPage();
        pdf.addImage(img,'JPEG',0,-offset,iw,ih,undefined,'FAST');
        offset+=ph;page++;
      }while(offset<ih-2);
      return pdf;
    }finally{holder.remove()}
  }

  async function downloadPdf(o){
    if(!ensureIssued(o))return;
    const old=document.body.style.cursor;document.body.style.cursor='progress';
    try{const pdf=await pdfDoc(o);if(pdf)pdf.save(`${o.invoice_no}.pdf`)}
    catch(e){console.error(e);toast(lang==='ar'?'تعذر إنشاء PDF، سأفتح الطباعة بدلاً منه':'PDF failed; opening print instead');printInvoice(o)}
    finally{document.body.style.cursor=old}
  }

  async function emailInvoice(o,automatic=false){
    if(!ensureIssued(o))return {ok:false};
    try{
      if(!automatic)toast(lang==='ar'?'جارٍ تجهيز الفاتورة…':'Preparing invoice…');
      const pdf=await pdfDoc(o);
      const pdf_base64=pdf?pdf.output('datauristring').split(',')[1]:null;
      const {data,error}=await sb.functions.invoke('send-invoice',{body:{order_id:o.id,pdf_base64}});
      if(error)throw error;
      if(!data?.ok){
        const msg=data?.needs_setup
          ?(lang==='ar'?'تم إصدار الفاتورة. إرسال الإيميل يحتاج إكمال إعداد البريد.':'Invoice issued. Email delivery needs mail setup.')
          :(data?.error||'Email failed');
        toast(msg);return data||{ok:false};
      }
      o.invoice_sent_at=new Date().toISOString();
      toast(lang==='ar'?'تم إرسال الفاتورة إلى البريد ✓':'Invoice emailed ✓');
      return data;
    }catch(e){
      console.error('SNB invoice email',e);
      toast(lang==='ar'?'الفاتورة جاهزة، لكن تعذر إرسال الإيميل الآن':'Invoice is ready, but email could not be sent');
      return {ok:false,error:e?.message||String(e)};
    }
  }

  window.snbInvoicePaperHtml=paper;
  window.snbInvoiceIssued=issued;
  window.snbOpenInvoice=id=>openInvoice(byId(id));
  window.snbPrintInvoice=id=>printInvoice(byId(id));
  window.snbDownloadInvoicePdf=id=>downloadPdf(byId(id));
  window.snbEmailInvoice=id=>emailInvoice(byId(id),false);
  window.snbOpenInvoiceAccount=index=>openInvoice(customerOrders()[index]);
  window.snbDownloadInvoiceAccount=index=>downloadPdf(customerOrders()[index]);

  const original=window.updateOrderStatus;
  if(typeof original==='function'){
    window.updateOrderStatus=async function(id,status){
      const before=adminOrders().find(o=>String(o.id)===String(id));
      const previous=before?.status;
      await original(id,status);
      const changed=adminOrders().find(o=>String(o.id)===String(id));
      if(!changed||changed.status!==status)return;
      if(status==='confirmed'&&previous!=='confirmed'){
        try{
          await loadAdminData();
          const fresh=adminOrders().find(o=>String(o.id)===String(id));
          if(fresh?.invoice_no){
            toast((lang==='ar'?'تم إصدار الفاتورة ':'Invoice issued ')+fresh.invoice_no);
            await emailInvoice(fresh,true);
            if(document.getElementById('adminApp'))renderAdminReplace('orders');
          }
        }catch(e){console.error('Invoice issue flow',e)}
      }
    };
  }
})();