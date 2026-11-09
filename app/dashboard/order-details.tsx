import Image from 'next/image';
import {useEffect,useState} from 'react';
import {api,money,type VendorOrder,type Contact} from '../components/commerce-client';
type FullProduct={id:string;name:string;description:string;priceMinor:number;stock:number;active:boolean;images:string[];attributes:Record<string,string>;category?:{name:string};vendor?:{name:string;city:string;zone:string};reviews?:{rating:number;comment:string;createdAt:string}[]};
function ProductDetails({productId,onClose}:{productId:string;onClose:()=>void}){
 const [data,setData]=useState<FullProduct|null>(null);const [error,setError]=useState('');
 useEffect(()=>{let live=true;api<FullProduct>('/catalog/products/'+productId).then(d=>{if(live)setData(d);}).catch(()=>{if(live)setError('This product is no longer published. Order snapshot is shown below.');});return ()=>{live=false;};},[productId]);
 const img=data?.images?.[0];
 return <div className="modal-backdrop" onClick={onClose} style={{zIndex:200}}><section className="modal" role="dialog" aria-modal="true" aria-label="Product details" style={{width:560,maxHeight:'90dvh',overflow:'auto'}} onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Close product details" onClick={onClose}>×</button>{!data&&!error&&<p>Loading product details…</p>}{error&&<p className="muted">{error}</p>}{data&&<><h2 style={{fontSize:20}}>{data.name}</h2>{img&&<Image src={img} unoptimized alt={data.name} width={520} height={340} style={{width:'100%',height:'auto',objectFit:'contain',borderRadius:12}}/>}<p><b>{money(data.priceMinor)}</b> · {data.stock} in stock · {data.active?'Published':'Unpublished'}</p>{data.description&&<p className="muted">{data.description}</p>}{data.category&&<p className="muted">Category: {data.category.name}</p>}{data.vendor&&<p className="muted">Vendor: {data.vendor.name} · {data.vendor.zone}, {data.vendor.city}</p>}{Object.keys(data.attributes||{}).length>0&&<dl className="settlement">{Object.entries(data.attributes).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}{data.reviews&&data.reviews.length>0&&<><h3>Recent reviews</h3>{data.reviews.slice(0,5).map((r,i)=><p key={i} className="muted">★ {r.rating} — {r.comment}</p>)}</>}</>}<p className="muted" style={{fontSize:11}}>Product ID: {productId}</p></section></div>;
}
function ContactInfo({person}:{person?:Contact|null}){
 if(!person)return <p>Not available</p>;
 return <><p>{person.firstName} {person.lastName}</p>{person.email&&<p>Email: <a href={`mailto:${person.email}`}>{person.email}</a></p>}{person.phone&&<p>Phone: <a href={`tel:${person.phone}`}>{person.phone}</a></p>}</>;
}
export function OrderDetails({order}:{order:VendorOrder}){
 const [selectedProduct,setSelectedProduct]=useState<string|null>(null);
 const a=order.order?.address;
 const hasPin=typeof a?.latitude==='number'&&typeof a?.longitude==='number';
 const destination=hasPin?`${a!.latitude},${a!.longitude}`:[a?.apartment,a?.building,a?.street,a?.zone,a?.city,'Pakistan'].filter(Boolean).join(', ');
 return <>
 <p className="muted">Checkout reference: {order.orderId}</p>
 <h3>Customer account</h3><ContactInfo person={order.order?.customer}/>
 <h3>Delivery recipient & location</h3>
 {a?<><ContactInfo person={a}/><p>Address type: {a.kind}</p><dl>{[['Apartment / floor',a.apartment],['Building',a.building],['Street',a.street],['Area / zone',a.zone],['City',a.city],['Delivery instructions',a.directions]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not provided'}</dd></div>)}</dl><p>{hasPin?`Saved location: ${a.latitude}, ${a.longitude}`:'No map pin saved. Map search uses the written address.'}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`} target="_blank" rel="noreferrer">Open delivery location in Maps ↗</a></>:<p>Delivery address unavailable</p>}
 <h3>Items ({order.items.reduce((n,i)=>n+i.quantity,0)})</h3>
 <div className="table-scroll"><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>{order.items.map(i=><tr key={i.productId}><td>{i.image&&<Image src={i.image} unoptimized alt={i.name} width={48} height={48}/>}<button type="button" className="product-link" onClick={()=>setSelectedProduct(i.productId)} title="View product details"><b>{i.name}</b></button><small style={{display:'block'}}>Product ID: {i.productId}</small></td><td>{i.quantity}</td><td>{money(i.unitPriceMinor)}</td><td>{money(i.unitPriceMinor*i.quantity)}</td></tr>)}</tbody></table></div>
 <h3>Payment & totals</h3><p>Method: {order.order?.paymentMethod}</p><p>Payment status: {order.order?.payment?.status?.replaceAll('_',' ')||(order.cashReceived?'Received by platform':'Cash on delivery · collection pending')}</p>
 <dl>{[['Items subtotal',order.subtotalMinor],['Discount',order.discountMinor],['Delivery fee',order.deliveryMinor],['Order total',order.totalMinor],['Platform commission',order.commissionMinor],['Vendor payable',order.payableMinor]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl>
 <h3>Delivery</h3>{order.order?.deliveryWindow?<p>Scheduled: {new Date(order.order.deliveryWindow.startsAt).toLocaleString()} – {new Date(order.order.deliveryWindow.endsAt).toLocaleString()}</p>:<p>Vendor delivery · no scheduled window</p>}
 <p>Assigned rider:</p>{order.rider?<ContactInfo person={order.rider}/>:<p>Not assigned yet</p>}
 {order.deliveredAt&&<p>Delivered: {new Date(order.deliveredAt).toLocaleString()}</p>}{order.failureReason&&<p>Delivery issue: {order.failureReason}</p>}
 <h3>Order status & history</h3>
 {selectedProduct&&<ProductDetails productId={selectedProduct} onClose={()=>setSelectedProduct(null)}/>}
 </>;
}
