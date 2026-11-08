import {parseInvoicePopover,invoicePopoverURL,extractPayment,paymentFolder,invoiceFileName,isPDF,amazonURL} from './core.js';
// Saves each order's invoice PDF into <root>/<payment folder>/. `root` is a
// FileSystemDirectoryHandle. Failures never skip an order silently: only a
// missing invoice link (Amazon issued none) is reported as "noInvoice".
export async function saveInvoices({orders,month,root,loadReceipt,fetchDoc,fetchBytes,signal,onProgress=()=>{},onDiagnostic=()=>{}}) {
  const result={saved:0,noInvoice:[],folders:{}};
  for(const [i,order] of orders.entries()) {
    signal?.throwIfAborted();
    onProgress({index:i+1,total:orders.length,orderId:order.id});
    const payment=extractPayment(await loadReceipt(order));
    onDiagnostic('receipt_ready',{orderId:order.id,index:i+1});
    const popoverURL=invoicePopoverURL(order);
    const {invoiceUrl}=parseInvoicePopover(await fetchDoc(popoverURL),popoverURL);
    if(!invoiceUrl){result.noInvoice.push(order.id);onDiagnostic('invoice_missing',{orderId:order.id,index:i+1});continue;}
    const bytes=await fetchBytes(amazonURL(invoiceUrl));
    if(!isPDF(bytes)) throw new Error(`注文 ${order.id}: 適格請求書のPDFを取得できませんでした。ログイン状態を確認してください。\n取得漏れを防ぐため、保存を中止しました。`);
    const folder=paymentFolder(payment);
    const dir=await root.getDirectoryHandle(folder,{create:true});
    const file=await dir.getFileHandle(invoiceFileName(order,month),{create:true});
    const out=await file.createWritable();
    try{await out.write(bytes);}catch(e){try{await out.abort();}catch{}throw e;}
    await out.close();
    result.saved++;result.folders[folder]=(result.folders[folder]||0)+1;
    onDiagnostic('invoice_saved',{orderId:order.id,index:i+1});
  }
  return result;
}
