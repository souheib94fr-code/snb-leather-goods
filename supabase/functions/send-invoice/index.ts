import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://souheib94fr-code.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function esc(v: unknown) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(v: unknown) {
  return "AED " + Number(v || 0).toFixed(2);
}

function adminKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const parsed = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return parsed.default || Object.values(parsed)[0] || "";
  } catch {
    return "";
  }
}

function invoiceHtml(order: any) {
  const rows = (order.order_items || []).map((i: any) =>
    "<tr>" +
      "<td style=\"padding:10px;border-bottom:1px solid #ece4d7\"><b>" + esc(i.product_name) + "</b><br><small style=\"color:#746a5c\">" + esc([i.size, i.color_name || i.color].filter(Boolean).join(" · ")) + "</small></td>" +
      "<td style=\"padding:10px;border-bottom:1px solid #ece4d7;text-align:center\">" + Number(i.qty || 0) + "</td>" +
      "<td style=\"padding:10px;border-bottom:1px solid #ece4d7;text-align:right\">" + money(i.unit_price) + "</td>" +
      "<td style=\"padding:10px;border-bottom:1px solid #ece4d7;text-align:right\"><b>" + money(Number(i.unit_price || 0) * Number(i.qty || 0)) + "</b></td>" +
    "</tr>"
  ).join("");

  return "<div style=\"margin:0;background:#f4f1eb;padding:28px;font-family:Arial,Tahoma,sans-serif;color:#17130e\">" +
    "<div style=\"max-width:720px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,.08)\">" +
      "<div style=\"background:#15110c;padding:28px;color:#f1cc7a\">" +
        "<div style=\"font-family:Georgia,serif;font-size:27px;letter-spacing:.08em\">SNB LEATHER GOODS</div>" +
        "<div style=\"font-size:11px;letter-spacing:.16em;margin-top:5px;color:#c8ad78\">SUBSTANCE · NUANCE · BRILLIANCE</div>" +
      "</div>" +
      "<div style=\"padding:28px\">" +
        "<div style=\"display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;border-bottom:2px solid #b98936;padding-bottom:18px;margin-bottom:20px\">" +
          "<div><div style=\"color:#8a641f;font-size:12px\">ELECTRONIC INVOICE / فاتورة إلكترونية</div><h2 style=\"margin:6px 0 0\">" + esc(order.invoice_no) + "</h2></div>" +
          "<div style=\"text-align:right\"><b>Order / الطلب</b><br>" + esc(order.order_no) + "<br><small style=\"color:#746a5c\">" + esc(new Date(order.invoice_issued_at || order.created_at).toLocaleString("en-AE")) + "</small></div>" +
        "</div>" +
        "<div style=\"margin-bottom:18px\"><b>" + esc(order.customer_name || "Customer") + "</b><br>" + esc(order.email) + "<br><span style=\"color:#746a5c\">" + esc([order.emirate, order.city, order.address].filter(Boolean).join(" · ")) + "</span></div>" +
        "<table style=\"width:100%;border-collapse:collapse\"><thead><tr style=\"background:#17130e;color:#f0ca77\"><th style=\"padding:10px;text-align:left\">Item / المنتج</th><th style=\"padding:10px\">Qty</th><th style=\"padding:10px;text-align:right\">Unit</th><th style=\"padding:10px;text-align:right\">Total</th></tr></thead><tbody>" + rows + "</tbody></table>" +
        "<div style=\"margin:22px 0 0 auto;max-width:330px\">" +
          "<div style=\"display:flex;justify-content:space-between;padding:6px 0\"><span>Subtotal</span><span>" + money(order.subtotal) + "</span></div>" +
          (Number(order.discount_amount || 0) > 0 ? "<div style=\"display:flex;justify-content:space-between;padding:6px 0\"><span>Discount</span><span>− " + money(order.discount_amount) + "</span></div>" : "") +
          (Number(order.coupon_discount || 0) > 0 ? "<div style=\"display:flex;justify-content:space-between;padding:6px 0\"><span>Coupon " + esc(order.coupon_code || "") + "</span><span>− " + money(order.coupon_discount) + "</span></div>" : "") +
          "<div style=\"display:flex;justify-content:space-between;padding:6px 0\"><span>Shipping</span><span>" + money(order.shipping_fee) + "</span></div>" +
          "<div style=\"display:flex;justify-content:space-between;padding:12px 0 0;border-top:2px solid #b98936;font-size:19px;font-weight:800\"><span>TOTAL</span><span>" + money(order.total) + "</span></div>" +
        "</div>" +
        "<div dir=\"rtl\" style=\"margin-top:28px;padding:15px;border-radius:12px;background:#faf7f0;text-align:right;color:#5f5548\">شكراً لاختياركم SNB Leather Goods. تم إصدار هذه الفاتورة إلكترونياً من سجل الطلب الرسمي.</div>" +
      "</div>" +
    "</div>" +
  "</div>";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = adminKey();
  if (!url || !key) return json({ ok: false, error: "Backend configuration missing" }, 500);

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const userResult = await admin.auth.getUser(token);
  const user = userResult.data.user;
  if (userResult.error || !user) return json({ ok: false, error: "Invalid session" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const orderId = String(body?.order_id || "");
  if (!orderId) return json({ ok: false, error: "Missing order_id" }, 400);

  const orderResult = await admin
    .from("orders")
    .select("*,order_items(*)")
    .eq("id", orderId)
    .maybeSingle();
  if (orderResult.error || !orderResult.data) return json({ ok: false, error: "Order not found" }, 404);
  const order: any = orderResult.data;

  const adminResult = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  const isAdmin = !!adminResult.data;
  const isOwner = String(order.user_id) === String(user.id);
  if (!isAdmin && !isOwner) return json({ ok: false, error: "Forbidden" }, 403);

  if (!order.invoice_no || order.status === "cancelled") {
    return json({ ok: false, error: "Invoice is not issued for this order yet" }, 409);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!resendKey) {
    return json({
      ok: false,
      needs_setup: true,
      error: "RESEND_API_KEY is not configured. Invoice PDF is available in the app."
    });
  }

  const from = Deno.env.get("RESEND_FROM") || "SNB Leather Goods <onboarding@resend.dev>";
  const attachments: any[] = [];
  const pdfBase64 = typeof body?.pdf_base64 === "string" ? body.pdf_base64.replace(/^data:application\/pdf;base64,/, "") : "";
  if (pdfBase64 && pdfBase64.length <= 12_000_000 && /^[A-Za-z0-9+/=\r\n]+$/.test(pdfBase64)) {
    attachments.push({ filename: String(order.invoice_no) + ".pdf", content: pdfBase64 });
  }

  const payload: any = {
    from,
    to: [String(order.email)],
    subject: "SNB Leather Goods — Invoice " + String(order.invoice_no),
    html: invoiceHtml(order)
  };
  if (attachments.length) payload.attachments = attachments;

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + resendKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const sendBody = await send.json().catch(() => ({}));
  if (!send.ok) {
    return json({ ok: false, error: sendBody?.message || "Email delivery failed", provider_status: send.status });
  }

  await admin.from("orders").update({ invoice_sent_at: new Date().toISOString() }).eq("id", orderId);
  return json({ ok: true, invoice_no: order.invoice_no, email_id: sendBody?.id || null });
});
