import Image from 'next/image';
import {money,type VendorOrder,type Contact} from '../components/commerce-client';
function ContactInfo({person}:{person?:Contact|null}){
 if(!person)return <p>Not available</p>;
 return <><p>{person.firstName} {person.lastName}</p>{person.email&&<p>Email: <a href={`mailto:${person.email}`}>{person.email}</a></p>}{person.phone&&<p>Phone: <a href={`tel:${person.phone}`}>{person.phone}</a></p>}</>;
}
export function OrderDetails({order}:{order:VendorOrder}){
 const a=order.order?.address;
 const hasPin=typeof a?.latitude==='number'&&typeof a?.longitude==='number';
 const destination=hasPin?`${a!.latitude},${a!.longitude}`:[a?.apartment,a?.building,a?.street,a?.zone,a?.city,'Pakistan'].filter(Boolean).join(', ');
 return <>
 <p className="muted">Checkout reference: {order.orderId}</p>
 <h3>Customer account</h3><ContactInfo person={order.order?.customer}/>
 <h3>Delivery recipient & location</h3>
 {a?<><ContactInfo person={a}/><p>Address type: {a.kind}</p><dl>{[['Apartment / floor',a.apartment],['Building',a.building],['Street',a.street],['Area / zone',a.zone],['City',a.city],['Delivery instructions',a.directions]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not provided'}</dd></div>)}</dl><p>{hasPin?`Saved location: ${a.latitude}, ${a.longitude}`:'No map pin saved. Map search uses the written address.'}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`} target="_blank" rel="noreferrer">Open delivery location in Maps ↗</a></>:<p>Delivery address unavailable</p>}
 <h3>Items ({order.items.reduce((n,i)=>n+i.quantity,0)})</h3>
 <div className="table-scroll"><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>{order.items.map(i=><tr key={i.productId}><td>{i.image&&<Image src={i.image} unoptimized alt={i.name} width={48} height={48}/>}<b>{i.name}</b><small style={{display:'block'}}>Product ID: {i.productId}</small></td><td>{i.quantity}</td><td>{money(i.unitPriceMinor)}</td><td>{money(i.unitPriceMinor*i.quantity)}</td></tr>)}</tbody></table></div>
 <h3>Payment & totals</h3><p>Method: {order.order?.paymentMethod}</p><p>Payment status: {order.order?.payment?.status?.replaceAll('_',' ')||(order.cashReceived?'Received by platform':'Cash on delivery · collection pending')}</p>
 <dl>{[['Items subtotal',order.subtotalMinor],['Discount',order.discountMinor],['Delivery fee',order.deliveryMinor],['Order total',order.totalMinor],['Platform commission',order.commissionMinor],['Vendor payable',order.payableMinor]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl>
 <h3>Delivery</h3>{order.order?.deliveryWindow?<p>Scheduled: {new Date(order.order.deliveryWindow.startsAt).toLocaleString()} – {new Date(order.order.deliveryWindow.endsAt).toLocaleString()}</p>:<p>Vendor delivery · no scheduled window</p>}
 <p>Assigned rider:</p>{order.rider?<ContactInfo person={order.rider}/>:<p>Not assigned yet</p>}
 {order.deliveredAt&&<p>Delivered: {new Date(order.deliveredAt).toLocaleString()}</p>}{order.failureReason&&<p>Delivery issue: {order.failureReason}</p>}
 <h3>Order status & history</h3>
 </>;
}
