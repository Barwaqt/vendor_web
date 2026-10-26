'use client';
import {useApi} from '../components/commerce-client';
import {Icon} from '../components/ui';
import {BrandLoader} from '../components/brand-loader';
import {ErrorState} from '../components/error-state';

type Contacts={phone:string;phone2:string;email:string;whatsapp:string};

const channels=[
 {key:'phone',icon:'phone',label:'Phone',hint:'Account, dispatch and settlement help',href:(v:string)=>'tel:'+v.replace(/[^+0-9]/g,''),external:false},
 {key:'phone2',icon:'phone2',label:'Alternate phone',hint:'Backup line for urgent orders',href:(v:string)=>'tel:'+v.replace(/[^+0-9]/g,''),external:false},
 {key:'whatsapp',icon:'whatsapp',label:'WhatsApp',hint:'Send order or settlement screenshots',href:(v:string)=>'https://wa.me/'+v.replace(/[^0-9]/g,''),external:true},
 {key:'email',icon:'mail',label:'Email',hint:'Invoices, documents and account changes',href:(v:string)=>'mailto:'+v,external:false}
] as const;

export function Support(){
 const query=useApi<Contacts>('/catalog/support');
 const contacts=query.data;
 const rows=contacts?channels.filter(c=>contacts[c.key]).map(c=>({...c,value:contacts[c.key]})):[];
 return <section className="panel support-panel">
  <div className="panel-heading">
   <div>
    <h2><Icon name="help"/>Vendor support</h2>
    <p className="muted">Reach the Barwaqt team for account, dispatch and settlement help. Barwaqt administrators publish these contacts.</p>
   </div>
   <button className="mini-button" onClick={query.reload} disabled={query.loading}>{query.loading?'Refreshing…':'Refresh'}</button>
  </div>
  {query.loading?<BrandLoader compact label="Loading support contacts…"/>
  :query.error?<ErrorState variant="inline" title={query.error} onRetry={query.reload} retryLabel="Retry"/>
  :rows.length?<div className="support-grid">{rows.map(c=><a className="support-card" key={c.key} href={c.href(c.value)} {...(c.external?{target:'_blank',rel:'noopener noreferrer'}:{})}><span className={`support-icon support-icon-${c.key}`}><Icon name={c.icon} size={22}/></span><span className="support-body"><small>{c.label}</small><b>{c.value}</b><em>{c.hint}</em></span><span className="support-go" aria-hidden="true"><Icon name="arrow" size={18}/></span></a>)}</div>
  :<div className="empty"><span className="icon-tile"><Icon name="help" size={19}/></span><h3>Support contacts are not published yet</h3><p>Barwaqt has not added a support phone, WhatsApp or email for vendors. They will appear here as soon as the administrator publishes them, so check back shortly.</p></div>}
  <p className="support-note"><Icon name="help" size={17}/><span>Support requests are handled by the Barwaqt team. Include your order number and business name so they can help you faster.</span></p>
 </section>;
}
