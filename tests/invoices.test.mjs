import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {parseInvoicePopover,extractPayment,paymentFolder,invoiceFileName,invoicePopoverURL,isPDF} from '../extension/core.js';
import {saveInvoices} from '../extension/invoices.js';
const doc=html=>new JSDOM(html).window.document;
const uuid='7d633c13-f04f-47e5-a019-72b35c8fb8f1';
const popover=`<ul><li><a href="/gp/css/summary/print.html?orderID=250-1111111-2222222">印刷可能な注文概要</a></li><li><a href="/documents/download/${uuid}/invoice.pdf">明細書／適格請求書</a></li><li><a href="/gp/help/contact/contact.html">請求書のリクエスト</a></li></ul>`;
const receipt=rows=>doc(`<div id="orderDetails">領収書 250-1111111-2222222<div data-component="viewPaymentPlanSummaryWidget">${rows.map(r=>`<span data-testid="payment-instrument-message">${r}</span>`).join('')}</div></div>`);
test('invoice link is taken from the popover; no link means no invoice',()=>{
  assert.equal(parseInvoicePopover(doc(popover)).invoiceUrl,`https://www.amazon.co.jp/documents/download/${uuid}/invoice.pdf`);
  assert.equal(parseInvoicePopover(doc('<a href="/gp/css/summary/print.html?orderID=1">印刷可能な注文概要</a>')).invoiceUrl,null);
  assert.throws(()=>parseInvoicePopover(doc('<input type="password">')));
  assert.throws(()=>parseInvoicePopover(doc(`<a href="https://evil.test/documents/download/${uuid}/invoice.pdf">x</a>`)),/Amazon以外/);
});
test('payment rows map to card / mixed / unknown folders',()=>{
  const cases=[
    [['Amazon Prime Mastercard •••• 1350'],'カード下4桁1350'],
    [['JCB •••• 2094','JCB •••• 2094'],'カード下4桁2094'],
    [['Amazonポイント','Amazon Prime Mastercard •••• 1350'],'混在'],
    [['JCB •••• 2094','Visa •••• 1111'],'混在'],
    [['Visa 下4桁 4321'],'カード下4桁4321'],
    [[],'不明'],[['Amazonポイント'],'不明']
  ];
  for(const [rows,folder] of cases) assert.equal(paymentFolder(extractPayment(receipt(rows))),folder,rows.join('|'));
  assert.equal(paymentFolder(extractPayment(doc('<div id="orderDetails">領収書</div>'))),'不明');
});
test('file and folder names are derived from validated fields only',()=>{
  assert.equal(invoiceFileName({id:'250-1111111-2222222',day:5},'2026-10'),'2026-10-05_250-1111111-2222222.pdf');
  assert.throws(()=>invoiceFileName({id:'../x',day:5},'2026-10'));
  assert.equal(paymentFolder({kind:'card',last4:'../x'}),'不明');
  assert.equal(invoicePopoverURL({id:'250-1111111-2222222'}),'https://www.amazon.co.jp/your-orders/invoice/popover?orderId=250-1111111-2222222');
  assert.ok(isPDF(new TextEncoder().encode('%PDF-1.4 x')));assert.ok(!isPDF(new TextEncoder().encode('<html>')));
});
// In-memory FileSystemDirectoryHandle.
const dirHandle=()=>{const dirs=new Map(),files=new Map();return {dirs,files,
  async getDirectoryHandle(n,o){if(!dirs.has(n)){if(!o?.create)throw new Error('missing');dirs.set(n,dirHandle());}return dirs.get(n);},
  async getFileHandle(n,o){if(!o?.create)throw new Error('missing');return {async createWritable(){let data;return {async write(b){data=b;},async close(){files.set(n,data);},async abort(){}};}};}};};
const pdf=new TextEncoder().encode('%PDF-1.4 test');
const orders=[{id:'250-1111111-2222222',day:5},{id:'250-3333333-4444444',day:6},{id:'250-5555555-6666666',day:7}];
const harness=(over={})=>({orders,month:'2026-10',root:dirHandle(),
  loadReceipt:async o=>receipt([o.id.startsWith('250-3')?'JCB •••• 2094':'Amazon Prime Mastercard •••• 1350']),
  fetchDoc:async url=>doc(url.includes('250-5')?'<a href="/gp/css/summary/print.html?orderID=x">印刷</a>':popover),
  fetchBytes:async()=>pdf,...over});
test('saves invoices into payment folders and reports orders without invoices',async()=>{
  const h=harness();const r=await saveInvoices(h);
  assert.equal(r.saved,2);assert.deepEqual(r.noInvoice,['250-5555555-6666666']);
  assert.deepEqual([...h.root.dirs.keys()].sort(),['カード下4桁1350','カード下4桁2094']);
  assert.ok(h.root.dirs.get('カード下4桁1350').files.has('2026-10-05_250-1111111-2222222.pdf'));
  assert.ok(h.root.dirs.get('カード下4桁2094').files.has('2026-10-06_250-3333333-4444444.pdf'));
});
test('a non-PDF response or fetch failure stops the whole run instead of skipping',async()=>{
  await assert.rejects(saveInvoices(harness({fetchBytes:async()=>new TextEncoder().encode('<html>login</html>')})),/PDFを取得できませんでした/);
  await assert.rejects(saveInvoices(harness({fetchDoc:async()=>{throw new Error('boom');}})),/boom/);
});
test('abort stops before the next order',async()=>{
  const c=new AbortController();let n=0;
  await assert.rejects(saveInvoices(harness({signal:c.signal,loadReceipt:async o=>{n++;c.abort();return receipt(['JCB •••• 2094']);}})));
  assert.equal(n,1);
});
