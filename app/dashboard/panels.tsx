'use client';
import PasswordInput from '../components/password-input';
import {SettlementBreakdown,SettlementTotals,type SettlementDetail} from './settlement-details';
import {UploadField} from '../components/upload-field';
import {useEffect,useState,useMemo} from 'react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {authRequest} from '../components/auth-client';
import {useVendorUser} from '../components/vendor-session';
import {BrandLoader} from '../components/brand-loader';
import {ErrorState} from '../components/error-state';
import {api,useApi,money,type Product,type Category,type VendorOrder,type Notice} from '../components/commerce-client';
type Business={id:string;name:string;description:string;address:string;city:string;zone:string;status:string;commissionBps:number};
type VendorProfile={categoryIds?:string[]|null};

type Summary={products:number;orders:{status:string;_count:number}[];delivered:{_sum:{subtotalMinor:number|null;commissionMinor:number|null;payableMinor:number|null}};recent:{id:string;status:string;totalMinor:number}[]};
function State({loading,error,retry}:{loading:boolean;error:string;retry:()=>void}){return loading?<BrandLoader label="Loading…"/>:error?<ErrorState variant="panel" message={error} onRetry={retry}/>:null;}
export function Overview(){const q=useApi<Summary>('/vendor/dashboard');return <section className="panel finance-page"><h2>Sales report · all time</h2><State {...q} retry={q.reload}/>{q.data&&<><div className="settlement"><article><h3>Products</h3><b>{q.data.products}</b></article><article><h3>Delivered gross sales</h3><b>{money(q.data.delivered._sum.subtotalMinor||0)}</b></article><article><h3>Commission</h3><b>{money(q.data.delivered._sum.commissionMinor||0)}</b></article><article><h3>Delivered vendor payable</h3><b>{money(q.data.delivered._sum.payableMinor||0)}</b><p>Includes settled orders; see Finance for settlements.</p></article></div><h3>Orders by status</h3>{q.data.orders.map(o=><p key={o.status}>{o.status}: {o._count}</p>)}<h3>Recent orders</h3>{q.data.recent.map(o=><p key={o.id}>{o.id} · {o.status} · {money(o.totalMinor)}</p>)}{!q.data.recent.length&&<p>No orders yet.</p>}</>}</section>;}
type VariantDraft={id?:string;name:string;price:string;stock:string;image?:string;options?:Record<string,string>};
const emptyProduct={name:'',slug:'',categoryId:'',description:'',price:'',stock:'0',images:'',attributes:'{}',variants:[] as VariantDraft[],expressDelivery:false,expressEtaMinutes:120,standardDeliveryDays:7,active:true};
const expressWindows:[number,string][]=[[30,'30 minutes'],[60,'1 hour'],[120,'2 hours'],[180,'3 hours'],[240,'4 hours'],[480,'8 hours'],[720,'12 hours'],[1440,'24 hours']];

const SIZE_PRESETS: Record<string, string[]> = {
  'Adult Apparel (Shirts, Tops, Dresses)': ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
  'Baby & Kids (0-5 Years)': ['0-3 Months', '3-6 Months', '6-12 Months', '1-2 Years', '2-3 Years', '3-4 Years', '4-5 Years'],
  'Pants & Waist (Inches)': ['28', '30', '32', '34', '36', '38', '40', '42'],
  'Footwear (EU Sizes)': ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  'One Size / Free Size': ['Free Size', 'One Size'],
  'Fragrance / Perfume (ml)': ['50 ml', '75 ml', '100 ml', '150 ml', '200 ml'],
};

const COMMON_COLORS = [
  'Black', 'White', 'Navy Blue', 'Royal Blue', 'Sky Blue', 'Red', 'Maroon',
  'Grey', 'Green', 'Olive', 'Pink', 'Beige', 'Brown', 'Yellow'
];

const ELECTRONICS_PRESETS: Record<string, string[]> = {
  'Storage': ['64GB', '128GB', '256GB', '512GB', '1TB'],
  'RAM': ['4GB', '8GB', '16GB', '32GB'],
};

const GROCERY_PRESETS: Record<string, string[]> = {
  'Weight / Volume': ['250g', '500g', '1kg', '2kg', '5kg', '250ml', '500ml', '1 Litre'],
  'Pack Size': ['Single Piece', 'Pack of 2', 'Pack of 3', 'Pack of 6', 'Pack of 12'],
};

function ProductDeliveryFields({value,onChange}:{value:{expressDelivery:boolean;expressEtaMinutes:number;standardDeliveryDays:number};onChange:(next:{expressDelivery:boolean;expressEtaMinutes:number;standardDeliveryDays:number})=>void}){return <fieldset><legend>Delivery options</legend><div className="form-grid"><label>Standard delivery<select value={value.standardDeliveryDays} onChange={e=>onChange({...value,standardDeliveryDays:Number(e.target.value)})}>{[1,2,3,4,5,6,7].map(days=><option key={days} value={days}>Within {days} day{days===1?'':'s'}</option>)}</select></label><label>Express delivery<select value={value.expressDelivery?'on':'off'} onChange={e=>onChange({...value,expressDelivery:e.target.value==='on'})}><option value="off">Not offered</option><option value="on">Offered</option></select></label>{value.expressDelivery&&<label>Express delivery time<select value={value.expressEtaMinutes} onChange={e=>onChange({...value,expressEtaMinutes:Number(e.target.value)})}>{expressWindows.map(([minutes,label])=><option key={minutes} value={minutes}>Within {label}</option>)}</select></label>}</div><p className="muted" style={{marginTop:6}}>Customers pick one option at checkout for this product. Express is only offered when every product in the basket supports it.</p></fieldset>}

function ProductVariantsField({value,onChange}:{value:VariantDraft[];onChange:(next:VariantDraft[])=>void}){
  const [variantsMode, setVariantsMode] = useState(false);
  // A loaded product with variants opens in variations mode; clearing the
  // variants switches back to a simple product without keeping stale state.
  const hasVariants = variantsMode || value.length > 0;
  const [activeTab, setActiveTab] = useState<'apparel'|'electronics'|'grocery'|'custom'>('apparel');
  const [sizeCategory, setSizeCategory] = useState<string>('Adult Apparel (Shirts, Tops, Dresses)');
  // Seed the pickers from a saved product so reopening the editor shows the
  // existing choices instead of a blank slate.
  const savedValues = (key: string) =>
    Array.from(new Set(value.map(v => v.options?.[key]).filter((item): item is string => Boolean(item))));
  const savedCustomKeys = Array.from(new Set(value.reduce<string[]>((keys, v) => keys.concat(Object.keys(v.options || {})), [])))
    .filter(key => key !== 'Color' && key !== 'Size');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => savedValues('Size'));
  const [customSize, setCustomSize] = useState('');
  const [selectedColors, setSelectedColors] = useState<{name:string;image?:string}[]>(() => {
    const colors = new Map<string, {name:string;image?:string}>();
    for (const variant of value) {
      const name = variant.options?.Color;
      if (!name) continue;
      colors.set(name, { name, image: colors.get(name)?.image || variant.image });
    }
    return [...colors.values()];
  });
  const [customColor, setCustomColor] = useState('');
  const [customOpt1Name, setCustomOpt1Name] = useState(() => savedCustomKeys[0] || 'Storage');
  const [customOpt1Values, setCustomOpt1Values] = useState<string[]>(() => savedValues(savedCustomKeys[0] || ''));
  const [customOpt1Input, setCustomOpt1Input] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  function updateRow(index:number, patch:Partial<VariantDraft>){
    onChange(value.map((v, i) => i === index ? { ...v, ...patch } : v));
  }

  function toggleSize(sz: string) {
    setSelectedSizes(prev => prev.includes(sz) ? prev.filter(s => s !== sz) : [...prev, sz]);
  }

  function addCustomSize() {
    const trimmed = customSize.trim();
    if (!trimmed) return;
    if (!selectedSizes.includes(trimmed)) setSelectedSizes(prev => [...prev, trimmed]);
    setCustomSize('');
  }

  function toggleColor(col: string) {
    setSelectedColors(prev => prev.some(c => c.name === col) ? prev.filter(c => c.name !== col) : [...prev, { name: col }]);
  }

  function addCustomColor() {
    const trimmed = customColor.trim();
    if (!trimmed) return;
    if (!selectedColors.some(c => c.name === trimmed)) setSelectedColors(prev => [...prev, { name: trimmed }]);
    setCustomColor('');
  }

  function updateColorImage(colName: string, image: string) {
    setSelectedColors(prev => prev.map(c => c.name === colName ? { ...c, image } : c));
    // Also update any existing rows with this color
    onChange(value.map(v => {
      if (v.options?.Color === colName || v.name.includes(`Color: ${colName}`)) {
        return { ...v, image };
      }
      return v;
    }));
  }

  function toggleCustomOpt(val: string) {
    setCustomOpt1Values(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  function addCustomOptVal() {
    const trimmed = customOpt1Input.trim();
    if (!trimmed) return;
    if (!customOpt1Values.includes(trimmed)) setCustomOpt1Values(prev => [...prev, trimmed]);
    setCustomOpt1Input('');
  }

  function generateCombinations() {
    const existingMap = new Map(value.map(v => [v.name, v]));
    const next: VariantDraft[] = [];

    if (activeTab === 'apparel') {
      if (selectedColors.length && selectedSizes.length) {
        for (const col of selectedColors) {
          for (const sz of selectedSizes) {
            const name = `Color: ${col.name} / Size: ${sz}`;
            const existing = existingMap.get(name);
            next.push({
              ...(existing?.id ? { id: existing.id } : {}),
              name,
              price: existing?.price || bulkPrice || '',
              stock: existing?.stock || bulkStock || '0',
              image: existing?.image || col.image || '',
              options: { Color: col.name, Size: sz }
            });
          }
        }
      } else if (selectedSizes.length) {
        for (const sz of selectedSizes) {
          const name = `Size: ${sz}`;
          const existing = existingMap.get(name);
          next.push({
            ...(existing?.id ? { id: existing.id } : {}),
            name,
            price: existing?.price || bulkPrice || '',
            stock: existing?.stock || bulkStock || '0',
            image: existing?.image || '',
            options: { Size: sz }
          });
        }
      } else if (selectedColors.length) {
        for (const col of selectedColors) {
          const name = `Color: ${col.name}`;
          const existing = existingMap.get(name);
          next.push({
            ...(existing?.id ? { id: existing.id } : {}),
            name,
            price: existing?.price || bulkPrice || '',
            stock: existing?.stock || bulkStock || '0',
            image: existing?.image || col.image || '',
            options: { Color: col.name }
          });
        }
      }
    } else if (activeTab === 'electronics') {
      if (customOpt1Values.length && selectedColors.length) {
        for (const col of selectedColors) {
          for (const opt of customOpt1Values) {
            const name = `Color: ${col.name} / ${customOpt1Name}: ${opt}`;
            const existing = existingMap.get(name);
            next.push({
              ...(existing?.id ? { id: existing.id } : {}),
              name,
              price: existing?.price || bulkPrice || '',
              stock: existing?.stock || bulkStock || '0',
              image: existing?.image || col.image || '',
              options: { Color: col.name, [customOpt1Name]: opt }
            });
          }
        }
      } else if (customOpt1Values.length) {
        for (const opt of customOpt1Values) {
          const name = `${customOpt1Name}: ${opt}`;
          const existing = existingMap.get(name);
          next.push({
            ...(existing?.id ? { id: existing.id } : {}),
            name,
            price: existing?.price || bulkPrice || '',
            stock: existing?.stock || bulkStock || '0',
            image: existing?.image || '',
            options: { [customOpt1Name]: opt }
          });
        }
      }
    } else {
      if (customOpt1Values.length) {
        for (const opt of customOpt1Values) {
          const name = `${customOpt1Name}: ${opt}`;
          const existing = existingMap.get(name);
          next.push({
            ...(existing?.id ? { id: existing.id } : {}),
            name,
            price: existing?.price || bulkPrice || '',
            stock: existing?.stock || bulkStock || '0',
            image: existing?.image || '',
            options: { [customOpt1Name]: opt }
          });
        }
      }
    }

    // Generating adds the newly picked combinations and refreshes matching
    // rows; rows the vendor already saved are kept until they remove them.
    const generatedNames = new Set(next.map(v => v.name));
    const generatedIds = new Set(next.map(v => v.id).filter(Boolean));
    const retained = value.filter(v => !generatedNames.has(v.name) && !(v.id && generatedIds.has(v.id)));
    if (next.length) {
      onChange([...next, ...retained]);
    }
  }

  function applyBulk(type: 'price' | 'stock') {
    if (type === 'price' && bulkPrice) {
      onChange(value.map(v => ({ ...v, price: bulkPrice })));
    }
    if (type === 'stock' && bulkStock) {
      onChange(value.map(v => ({ ...v, stock: bulkStock })));
    }
  }

  return (
    <fieldset className="variant-builder">
      <legend><b>Product variations & options</b></legend>
      <div className="variant-mode-selector">
        <label>
          <input type="radio" name="prod-variation-mode" checked={!hasVariants} onChange={() => { setVariantsMode(false); onChange([]); }} />
          <span><b>Simple product</b> (Single price & stock, no variations like books or standard appliances)</span>
        </label>
        <label>
          <input type="radio" name="prod-variation-mode" checked={hasVariants} onChange={() => setVariantsMode(true)} />
          <span><b>Product with variations</b> (Sizes, Colors, Models, Storage)</span>
        </label>
      </div>

      {!hasVariants ? (
        <p className="muted" style={{ margin: '8px 0 0' }}>
          This product has a single standard price and stock. Enter the price and stock fields above.
        </p>
      ) : (
        <div>
          <p className="muted" style={{ margin: '0 0 12px' }}>
            Choose variations below (like Daraz/Amazon). Select predefined sizes and colors, attach photos to colors, and set prices. The product listing price will automatically start from your lowest variant price.
          </p>

          <div className="variant-preset-tabs" role="tablist">
            <button type="button" className={`variant-preset-btn ${activeTab === 'apparel' ? 'active' : ''}`} onClick={() => setActiveTab('apparel')}>👕 Apparel (Clothing, Shirts, Dresses)</button>
            <button type="button" className={`variant-preset-btn ${activeTab === 'electronics' ? 'active' : ''}`} onClick={() => { setActiveTab('electronics'); setCustomOpt1Name('Storage'); }}>📱 Electronics (Storage, RAM, Color)</button>
            <button type="button" className={`variant-preset-btn ${activeTab === 'grocery' ? 'active' : ''}`} onClick={() => { setActiveTab('grocery'); setCustomOpt1Name('Weight / Pack'); }}>🥫 Groceries & Pack Sizes</button>
            <button type="button" className={`variant-preset-btn ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => { setActiveTab('custom'); setCustomOpt1Name('Option'); }}>⚙ Custom Variation</button>
          </div>

          {activeTab === 'apparel' && (
            <div style={{ background: '#fff', border: '1px solid #dce4dd', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ marginBottom: 14 }}>
                <b style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>1. Select Size Category</b>
                <select value={sizeCategory} onChange={e => setSizeCategory(e.target.value)} style={{ maxWidth: 380 }}>
                  {Object.keys(SIZE_PRESETS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: '#55655b', fontWeight: 600 }}>Click sizes to add:</span>
                  <div className="variant-chip-group">
                    {SIZE_PRESETS[sizeCategory]?.map(sz => (
                      <button type="button" key={sz} className={`variant-chip ${selectedSizes.includes(sz) ? 'selected' : ''}`} onClick={() => toggleSize(sz)}>
                        {selectedSizes.includes(sz) ? '✓ ' : '+ '}{sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="variant-custom-input">
                  <input placeholder="Add custom size (e.g. 30 ml, 0 to 5 months, Tailored)" value={customSize} onChange={e => setCustomSize(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }} />
                  <button type="button" onClick={addCustomSize}>+ Add Size</button>
                </div>

                {selectedSizes.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <b>Selected sizes ({selectedSizes.length}):</b> {selectedSizes.map(sz => (
                      <span key={sz} className="pill" style={{ margin: '2px 4px', background: '#dcf1dc', color: '#1a5c28' }}>
                        {sz} <button type="button" className="variant-chip-remove" onClick={() => toggleSize(sz)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #edf2ee', paddingTop: 14 }}>
                <b style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>2. Select Colors & Attach Variant Photos</b>
                <div className="variant-chip-group">
                  {COMMON_COLORS.map(col => {
                    const isSelected = selectedColors.some(c => c.name === col);
                    return (
                      <button type="button" key={col} className={`variant-chip ${isSelected ? 'selected' : ''}`} onClick={() => toggleColor(col)}>
                        {isSelected ? '✓ ' : '+ '}{col}
                      </button>
                    );
                  })}
                </div>

                <div className="variant-custom-input">
                  <input placeholder="Add custom color (e.g. Burgundy, Mustard, Rose Gold)" value={customColor} onChange={e => setCustomColor(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor(); } }} />
                  <button type="button" onClick={addCustomColor}>+ Add Color</button>
                </div>

                {selectedColors.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <b style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Color photo attachments:</b>
                    <p className="muted" style={{ fontSize: 11, margin: '0 0 8px' }}>Customers will see this photo switch automatically when clicking this color.</p>
                    {selectedColors.map(col => (
                      <div key={col.name} className="variant-color-row">
                        <span style={{ fontWeight: 600, minWidth: 90 }}>{col.name}</span>
                        {col.image ? (
                          <img src={resolveImageUrl(col.image)} alt={col.name} className="variant-color-thumb" />
                        ) : (
                          <div className="variant-color-thumb" style={{ display: 'grid', placeItems: 'center', background: '#f0f3f1', fontSize: 10, color: '#888' }}>No photo</div>
                        )}
                        <input style={{ flex: 1, minWidth: 160 }} placeholder="Paste HTTPS image URL or use upload below" value={col.image || ''} onChange={e => updateColorImage(col.name, e.target.value)} />
                        <UploadField multiple={false} onUploaded={urls => { if (urls[0]) updateColorImage(col.name, urls[0]); }} />
                        <button type="button" onClick={() => toggleColor(col.name)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'electronics' && (
            <div style={{ background: '#fff', border: '1px solid #dce4dd', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <b style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>1. Storage / Memory</b>
              <div className="variant-chip-group">
                {ELECTRONICS_PRESETS['Storage'].map(st => (
                  <button type="button" key={st} className={`variant-chip ${customOpt1Values.includes(st) ? 'selected' : ''}`} onClick={() => toggleCustomOpt(st)}>
                    {customOpt1Values.includes(st) ? '✓ ' : '+ '}{st}
                  </button>
                ))}
              </div>
              <div className="variant-custom-input">
                <input placeholder="Add custom storage or capacity (e.g. 2TB, 64GB+4GB)" value={customOpt1Input} onChange={e => setCustomOpt1Input(e.target.value)} />
                <button type="button" onClick={addCustomOptVal}>+ Add</button>
              </div>

              <div style={{ borderTop: '1px solid #edf2ee', paddingTop: 14, marginTop: 12 }}>
                <b style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>2. Colors</b>
                <div className="variant-chip-group">
                  {['Space Grey', 'Silver', 'Gold', 'Midnight', 'Black', 'White', 'Blue'].map(col => {
                    const isSelected = selectedColors.some(c => c.name === col);
                    return (
                      <button type="button" key={col} className={`variant-chip ${isSelected ? 'selected' : ''}`} onClick={() => toggleColor(col)}>
                        {isSelected ? '✓ ' : '+ '}{col}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grocery' && (
            <div style={{ background: '#fff', border: '1px solid #dce4dd', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <b style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Pack Sizes & Weights</b>
              <div className="variant-chip-group">
                {GROCERY_PRESETS['Weight / Volume'].concat(GROCERY_PRESETS['Pack Size']).map(val => (
                  <button type="button" key={val} className={`variant-chip ${customOpt1Values.includes(val) ? 'selected' : ''}`} onClick={() => toggleCustomOpt(val)}>
                    {customOpt1Values.includes(val) ? '✓ ' : '+ '}{val}
                  </button>
                ))}
              </div>
              <div className="variant-custom-input">
                <input placeholder="Add custom weight or pack (e.g. 100g, Pack of 4)" value={customOpt1Input} onChange={e => setCustomOpt1Input(e.target.value)} />
                <button type="button" onClick={addCustomOptVal}>+ Add</button>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div style={{ background: '#fff', border: '1px solid #dce4dd', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <label>Variation Name (e.g. Flavor, Model, Scent)
                <input value={customOpt1Name} onChange={e => setCustomOpt1Name(e.target.value)} />
              </label>
              <div className="variant-custom-input">
                <input placeholder="Add value (e.g. Vanilla, Standard Edition)" value={customOpt1Input} onChange={e => setCustomOpt1Input(e.target.value)} />
                <button type="button" onClick={addCustomOptVal}>+ Add Value</button>
              </div>
              <div className="variant-chip-group">
                {customOpt1Values.map(val => (
                  <span key={val} className="pill" style={{ margin: '2px 4px', background: '#eaf4eb', color: '#1a5c28' }}>
                    {val} <button type="button" className="variant-chip-remove" onClick={() => toggleCustomOpt(val)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '14px 0', flexWrap: 'wrap' }}>
            <button type="button" className="primary" onClick={generateCombinations} style={{ padding: '9px 18px' }}>
              ⚡ Generate / Update Variant Rows
            </button>
            <button type="button" onClick={() => onChange([...value, { name: '', price: bulkPrice || '', stock: bulkStock || '0' }])}>
              + Add single row manually
            </button>
          </div>

          {value.length > 0 && (
            <div className="variant-bulk-bar">
              <b>Bulk Actions:</b>
              <label style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Price:
                <input type="number" min="0.01" step="0.01" placeholder="PKR" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} />
                <button type="button" onClick={() => applyBulk('price')}>Apply to all</button>
              </label>
              <label style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Stock:
                <input type="number" min="0" step="1" placeholder="Qty" value={bulkStock} onChange={e => setBulkStock(e.target.value)} />
                <button type="button" onClick={() => applyBulk('stock')}>Apply to all</button>
              </label>
            </div>
          )}

          {value.length > 0 ? (
            <div className="variant-table-wrap">
              <table className="variant-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>Photo</th>
                    <th>Variant Description (Name)</th>
                    <th style={{ width: 140 }}>Price (PKR)</th>
                    <th style={{ width: 100 }}>Stock</th>
                    <th style={{ width: 80 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {value.map((variant, index) => (
                    <tr key={variant.id || index}>
                      <td>
                        {variant.image ? (
                          <img src={resolveImageUrl(variant.image)} alt="" className="variant-color-thumb" />
                        ) : (
                          <div className="variant-color-thumb" style={{ display: 'grid', placeItems: 'center', background: '#f5f7f5', fontSize: 9, color: '#aaa' }}>No img</div>
                        )}
                      </td>
                      <td>
                        <input required maxLength={120} placeholder="e.g. Color: Red / Size: Medium" value={variant.name} onChange={e => updateRow(index, { name: e.target.value })} />
                      </td>
                      <td>
                        <input required type="number" min="0.01" step="0.01" value={variant.price} onChange={e => updateRow(index, { price: e.target.value })} />
                      </td>
                      <td>
                        <input required type="number" min="0" step="1" value={variant.stock} onChange={e => updateRow(index, { stock: e.target.value })} />
                      </td>
                      <td>
                        <button type="button" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => onChange(value.filter((_, i) => i !== index))}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ fontStyle: 'italic', margin: '8px 0' }}>
              No variant rows generated yet. Select sizes/colors above and click &quot;Generate / Update Variant Rows&quot;, or click &quot;+ Add single row manually&quot;.
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}

function ViewSwitch({value,onChange,label}:{value:'grid'|'list';onChange:(value:'grid'|'list')=>void;label:string}){return <div className="view-switch" role="group" aria-label={label+' view'}><button type="button" aria-pressed={value==='grid'} onClick={()=>onChange('grid')}>▦ Grid</button><button type="button" aria-pressed={value==='list'} onClick={()=>onChange('list')}>☷ List</button></div>}
function slugFromName(name:string,existingSlugs:Set<string>):string{
  const base=name.toLowerCase().trim().replace(/[^a-z0-9-]+/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,180);
  if(!base)return base;
  if(!existingSlugs.has(base))return base;
  for(let n=2;n<=999;n++){
    const trial=`${base}-${n}`;
    if(!existingSlugs.has(trial)&&trial.length<=180)return trial;
  }
  return `${base}-${Date.now()%10000}`;
}
function resolveImageUrl(src?: string | null) {
  if (!src) return '';
  if (src.startsWith('/uploads/')) return `https://api.barwaqt.com${src}`;
  return src;
}
export function Products({initialOpen=false}:{initialOpen?:boolean}){const [view,setView]=useState<'grid'|'list'>('grid');const [page,setPage]=useState(1);const [search,setSearch]=useState('');const [reviewStatus,setReviewStatus]=useState('');const list=useApi<Product[]>('/vendor/products?limit=20&page='+page+'&search='+encodeURIComponent(search)+(reviewStatus?'&reviewStatus='+reviewStatus:''));const vendorProfile=useApi<VendorProfile>('/vendor/profile');const vendorCategories=useApi<Category[]>('/catalog/categories?ids='+((vendorProfile.data&&vendorProfile.data.categoryIds&&vendorProfile.data.categoryIds.length)?vendorProfile.data.categoryIds.join(','):''));const [draft,setDraft]=useState(emptyProduct);const [editing,setEditing]=useState<string|null>(initialOpen?'':null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const existingSlugs=useMemo(()=>new Set(list.data?.map(p=>p.slug)||[]),[list.data]);function changeName(name:string){setDraft(d=>{const previousAuto=slugFromName(d.name,existingSlugs);const nextAuto=slugFromName(name,existingSlugs);return {...d,name,slug:(!d.slug||d.slug===previousAuto)&&nextAuto?nextAuto:d.slug}})}; const draftImages=draft.images.split('\n').map(s=>s.trim()).filter(Boolean); return <section className="panel"><div className="panel-heading"><h2>Product catalog</h2><ViewSwitch value={view} onChange={setView} label="Products"/><button className="primary" onClick={()=>{setDraft({...emptyProduct,categoryId:vendorCategories.data?.[0]?.id||''});setEditing('');}}>Add product</button></div><p className="muted">New products and listing changes need administrator approval before customers can see them. Stock updates do not require another review.</p><select aria-label="Review status" value={reviewStatus} onChange={e=>{setReviewStatus(e.target.value);setPage(1);}}><option value="">All review statuses</option><option value="PENDING">Pending review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select><input aria-label="Search products" placeholder="Search products" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/><State {...list} retry={list.reload}/><div className={`catalog catalog-${view}`}>{list.data?.map(p=><article key={p.id}>{p.images[0]?<Image src={resolveImageUrl(p.images[0])} alt={p.name} width={180} height={150} unoptimized style={{objectFit:'contain'}}/>:<div className="catalog-image-placeholder">No image</div>}<div className="catalog-info"><h3>{p.name}</h3><p>{vendorCategories.data?.find(c=>c.id===p.categoryId)?.name||'Uncategorized'}</p><p><b>{money(p.priceMinor)}</b> · {p.stock} in stock · {p.reviewStatus==='APPROVED'?(p.active?'Published':'Unpublished'):'Not published'}</p><p className="pill">{p.reviewStatus==='PENDING'?'Pending review':p.reviewStatus==='REJECTED'?'Rejected':'Approved'}</p>{p.rejectionReason&&<p role="note"><b>Reason for rejection:</b> {p.rejectionReason}</p>}</div><div className="catalog-actions"><button onClick={()=>{setDraft({name:p.name,slug:p.slug,categoryId:p.categoryId,description:p.description,price:String(p.priceMinor/100),stock:String(p.stock),images:p.images.join('\n'),attributes:JSON.stringify(p.attributes,null,2),variants:(p.variants||[]).map(v=>({id:v.id,name:v.name,price:String(v.priceMinor/100),stock:String(v.stock),image:v.image||'',options:v.options||{}})),expressDelivery:!!p.expressDelivery,expressEtaMinutes:p.expressEtaMinutes||120,standardDeliveryDays:p.standardDeliveryDays||7,active:p.active});setEditing(p.id);}}>Edit</button><button disabled={busy} onClick={async()=>{setBusy(true);try{await api('/vendor/products/'+p.id,'PATCH',{active:!p.active});list.reload();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>{p.active?'Disable listing':p.reviewStatus==='APPROVED'?'Publish':'Enable after approval'}</button></div></article>)}</div>{!list.loading&&!list.error&&!list.data?.length&&<p>No products. Add your first product.</p>}<div className="live-actions"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>Previous</button><span>Page {page}</span><button disabled={(list.data?.length||0)<20} onClick={()=>setPage(v=>v+1)}>Next</button></div><p role="status">{message}</p>{editing!==null&&<div className="modal-backdrop"><section className="modal product-editor" role="dialog" aria-modal="true" aria-label="Product editor"><button className="modal-close" aria-label="Close product editor" disabled={busy} onClick={()=>setEditing(null)}>×</button><form className="product-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const attributes=JSON.parse(draft.attributes);if(!attributes||Array.isArray(attributes)||typeof attributes!=='object'||Object.values(attributes).some(v=>typeof v!=='string'))throw new Error('Attributes must be a JSON object with string values.');const variants=draft.variants.map(v=>({...(v.id?{id:v.id}:{}),name:v.name.trim(),priceMinor:Math.round(Number(v.price)*100),stock:Number(v.stock),image:v.image?v.image.trim():null,options:v.options||{}}));const saved=await api<Product>('/vendor/products'+(editing?'/'+editing:''),editing?'PATCH':'POST',{name:draft.name,slug:draft.slug,categoryId:draft.categoryId,description:draft.description,priceMinor:variants.length?Math.min(...variants.map(v=>v.priceMinor)):Math.round(Number(draft.price)*100),stock:variants.length?variants.reduce((sum,v)=>sum+v.stock,0):Number(draft.stock),images:draft.images.split('\n').map(s=>s.trim()).filter(Boolean),attributes,variants,expressDelivery:draft.expressDelivery,expressEtaMinutes:draft.expressEtaMinutes,standardDeliveryDays:draft.standardDeliveryDays,active:draft.active});setEditing(null);list.reload();setMessage(saved.reviewStatus==='PENDING'?'Product submitted for admin review. It will appear to customers after approval.':'Product saved.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}><h2>{editing?'Edit product':'New product'}</h2><p className="editor-subtitle">Fill in each section below. New products and listing changes go to admin review before customers can see them.</p><fieldset className="form-section"><legend>Product details</legend><div className="form-grid"><label className="span-2">Product Name<input required maxLength={120} value={draft.name} onChange={e=>changeName(e.target.value)} placeholder="e.g. Men's Casual Cotton Shirt" /></label><label>Slug<input required maxLength={180} value={draft.slug} onChange={e=>setDraft({...draft,slug:e.target.value})} onBlur={e=>{if(!e.target.value.trim())setDraft({...draft,slug:slugFromName(draft.name,existingSlugs)});}} /><small className="muted">Auto-generated from product name. Edit to override.</small></label><label>Category<select required value={draft.categoryId} onChange={e=>setDraft({...draft,categoryId:e.target.value})}><option value="">Choose category</option>{vendorCategories.data?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div></fieldset>{vendorCategories.error&&<p role="alert">{vendorCategories.error}</p>}<fieldset className="form-section"><legend>Price &amp; stock</legend>{draft.variants.length===0?(<div className="form-grid"><label>Price (PKR)<input required type="number" min="0.01" step="0.01" value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})} placeholder="Single product price" /></label><label>Stock<input required type="number" min="0" step="1" value={draft.stock} onChange={e=>setDraft({...draft,stock:e.target.value})} placeholder="Inventory count" /></label></div>):(<div className="calc-note"><b>Price &amp; stock come from your variants</b><p>Starting price: PKR {Math.min(...draft.variants.map(v=>Number(v.price)||0)).toFixed(2)} · Total stock: {draft.variants.reduce((s,v)=>s+(Number(v.stock)||0),0)}</p></div>)}</fieldset><ProductVariantsField value={draft.variants} onChange={variants=>setDraft({...draft,variants})}/><ProductDeliveryFields value={{expressDelivery:draft.expressDelivery,expressEtaMinutes:draft.expressEtaMinutes,standardDeliveryDays:draft.standardDeliveryDays}} onChange={delivery=>setDraft({...draft,...delivery})}/><fieldset className="form-section"><legend>Description &amp; attributes</legend><div className="form-grid"><label className="span-2">Description<textarea maxLength={10000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label><label>Attributes (JSON)<textarea value={draft.attributes} onChange={e=>setDraft({...draft,attributes:e.target.value})}/></label></div></fieldset><fieldset className="form-section"><legend>Product images</legend><div className="form-grid"><label className="span-2">Image URLs (one HTTPS URL per line; max 12)<textarea value={draft.images} onChange={e=>setDraft({...draft,images:e.target.value})}/></label></div><UploadField multiple onUploaded={urls=>setDraft(draft=>{const current=draft.images.split('\n').map(s=>s.trim()).filter(Boolean);const room=Math.max(0,12-current.length);const next=[...current,...urls.slice(0,room).filter(url=>!current.includes(url))];return {...draft,images:next.join('\n')}})}/>{draftImages.length>0&&<div className="image-previews">{draftImages.map(url=><div className="image-preview" key={url}><Image src={resolveImageUrl(url)} alt="" width={72} height={72} unoptimized/><button type="button" aria-label="Remove image" onClick={()=>setDraft(draft=>({...draft,images:draft.images.split('\n').map(s=>s.trim()).filter(Boolean).filter(item=>item!==url).join('\n')}))}>×</button></div>)}</div>}<small className="muted">PNG, JPEG or WebP, up to 5 MB each. Select several images at once. Maximum 12 product images.</small></fieldset><p role="alert">{message}</p><div className="form-footer"><label className="publish-toggle"><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/> Enable publication after approval</label><button className="primary" disabled={busy}>{busy?'Submitting…':'Save and submit for review'}</button></div></form></section></div>}</section>;
}
export function Orders(){const [page,setPage]=useState(1);const [status,setStatus]=useState('');const [section,setSection]=useState('');const list=useApi<VendorOrder[]>('/orders?limit=20&page='+page+(status?'&status='+status:'')+(section?'&section='+section:''));const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');async function act(id:string,action:string){let reason:string|undefined;if(action==='reject'){reason=prompt('Reason for rejection (at least 3 characters)')||undefined;if(!reason)return;}setBusy(true);try{await api('/orders/'+id+'/actions','POST',{action,...(reason?{reason}:{})});list.reload();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}return <section className="panel"><h2>Orders</h2><select aria-label="Order section" value={section} onChange={e=>{setSection(e.target.value);setPage(1);}}><option value="">All orders</option><option value="regular">Regular</option><option value="wspan">WSPAN (repeat cancellations)</option></select><select aria-label="Order status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All statuses</option>{['NEW','PREPARING','READY','ASSIGNED','PICKED_UP','DELIVERED','FAILED','CANCELLED','RETURNED'].map(v=><option key={v}>{v}</option>)}</select><button onClick={list.reload}>Refresh</button><State {...list} retry={list.reload}/>{list.data?.map(o=><article className="panel" key={o.id}><h3>{o.id}{o.order?.isWspan?' · WSPAN':''}</h3>{o.order?.isWspan&&<p><b>WSPAN order</b> — this customer has cancelled {o.order?.cancelledShipments||0} previous shipments. Verify before accepting.</p>}<p>{o.status} · {money(o.totalMinor)} · {new Date(o.createdAt).toLocaleString()}</p><p>{o.order?.address.firstName} {o.order?.address.lastName} · {o.order?.address.phone}</p><p>{o.order?.address.street}, {o.order?.address.zone}, {o.order?.address.city}</p>{o.items.map(i=><p key={i.productId}>{i.name}{i.variantName?` (${i.variantName})`:''} × {i.quantity} · {money(i.unitPriceMinor*i.quantity)}</p>)}<div className="live-actions">{o.status==='NEW'&&<><button disabled={busy} onClick={()=>act(o.id,'accept')}>Accept</button><button disabled={busy} onClick={()=>act(o.id,'reject')}>Reject</button></>}{o.status==='PREPARING'&&<button disabled={busy} onClick={()=>act(o.id,'ready')}>Ready for pickup</button>}</div><details><summary>History</summary>{o.events.map((e,i)=><p key={i}>{e.status} · {new Date(e.createdAt).toLocaleString()} {e.note}</p>)}</details></article>)}{!list.loading&&!list.error&&!list.data?.length&&<p>No orders.</p>}<p role="alert">{message}</p><div className="live-actions"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>Previous</button><span>Page {page}</span><button disabled={(list.data?.length||0)<20} onClick={()=>setPage(v=>v+1)}>Next</button></div></section>;}
export function Finance(){const list=useApi<SettlementDetail[]>('/vendor/settlements');const [filter,setFilter]=useState('ALL');return <section className="panel finance-page"><div className="panel-heading"><h2>Settlements & payouts</h2><button className="mini-button" onClick={list.reload}>Refresh</button></div><p className="muted">Barwaqt collects customer payments and pays your store after reconciliation. Delivered item sales − discounts − commission + adjustments = vendor payout. Delivery fees are retained by the platform.</p><p className="muted">Pending: created for review. Processed: approved, awaiting transfer. Paid: admin has recorded the completed transfer and reference.</p><State {...list} retry={list.reload}/>{list.data&&<SettlementTotals rows={list.data}/>}<label>Status<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All statuses</option><option value="PENDING">Pending review</option><option value="PROCESSED">Awaiting payment</option><option value="PAID">Paid</option></select></label><p className="muted">Latest 100 settlements. Summary totals cover these records only; orders not yet added to a settlement are excluded.</p>{list.data?.filter(s=>filter==='ALL'||s.status===filter).map(s=><article className="settlement-record" key={s.id}><div className="settlement-record-heading"><h3>{money(s.amountMinor)}</h3><span className="pill">{s.status==='PROCESSED'?'Awaiting payment':s.status}</span></div><p>Payment reference: {s.reference||'Not recorded yet'}</p><SettlementBreakdown settlement={s}/></article>)}{!list.loading&&!list.error&&!list.data?.some(s=>filter==='ALL'||s.status===filter)&&<div className="empty"><h3>No matching settlements</h3><p>Delivered orders become eligible once Barwaqt receives payment. Open returns may hold an order. Admin creates and pays settlements.</p></div>}</section>;}

export function Notifications(){const list=useApi<Notice[]>('/notifications');const reload=list.reload;const [message,setMessage]=useState('');const [busy,setBusy]=useState('');useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')reload()},30000);return()=>clearInterval(timer)},[reload]);return <section className="panel notification-panel"><div className="panel-heading"><div><h2>Notifications</h2><p className="muted">Order activity and updates from Barwaqt.</p></div><button className="mini-button" onClick={list.reload}>Refresh</button></div><State {...list} retry={list.reload}/>{list.data?.map(n=><article className={`notification-card ${n.readAt?'':'unread'}`} key={n.id}><div className="notification-dot" aria-hidden="true"/><div><div className="notification-heading"><h3>{n.title}</h3><span className="muted">{new Date(n.createdAt).toLocaleString()}</span></div><p>{n.body}</p>{!n.readAt?<button className="mini-button" disabled={busy===n.id} onClick={async()=>{setBusy(n.id);setMessage('');try{await api('/notifications/'+n.id+'/read','PATCH');list.reload();}catch(e){setMessage((e as Error).message);}finally{setBusy('');}}}>{busy===n.id?'Saving…':'Mark read'}</button>:<small className="muted">Read</small>}</div></article>)}{!list.loading&&!list.error&&!list.data?.length&&<div className="empty"><h3>You’re all caught up</h3><p>New order activity will appear here.</p></div>}<p role="alert">{message}</p></section>;}

type Place={placeId:string;mainText:string;secondaryText:string};
function LocationDetect({onDetect}:{onDetect:(address:string)=>void}){
 const [query,setQuery]=useState('');const [results,setResults]=useState<Place[]>([]);const [busy,setBusy]=useState('');const [message,setMessage]=useState('');
 function fill(address:string,source:string){onDetect(address.trim().slice(0,200));setResults([]);setQuery('');setMessage(`Address filled from ${source}. Save changes to update your business profile.`);}
 async function pick(placeId:string){setBusy(placeId);setMessage('');try{const place=await api<{formattedAddress?:string;name?:string}>('/maps/place-details?placeId='+encodeURIComponent(placeId));const address=(place.formattedAddress||place.name||'').trim();if(!address)throw new Error('No address found for that place.');fill(address,'Google Maps');}catch(e){setMessage((e as Error).message);}finally{setBusy('');}}
 async function search(){const q=query.trim();if(q.length<3)return;setBusy('search');setMessage('');try{const places=await api<Place[]>('/maps/search?query='+encodeURIComponent(q));setResults(places);if(!places.length)setMessage('No places found. Try a landmark or area name.');}catch(e){setMessage((e as Error).message);}finally{setBusy('');}}
 function locate(){
  if(!navigator.geolocation){setMessage('Your browser does not support location detection. Search for your area instead.');return;}
  setBusy('gps');setMessage('Detecting your location…');
  navigator.geolocation.getCurrentPosition(async position=>{
   try{const place=await api<{formattedAddress?:string}>('/maps/reverse-geocode?lat='+position.coords.latitude+'&lng='+position.coords.longitude);const address=(place.formattedAddress||'').trim();if(!address)throw new Error('No address found for your current location.');fill(address,'your current location');}
   catch(e){setMessage((e as Error).message);}
   finally{setBusy('');}
  },()=>{setBusy('');setMessage('Location permission was denied. Search for your area instead.');},{enableHighAccuracy:true,timeout:10000});
 }
 return <div className="location-detect">
  <div className="location-detect-heading"><b>Detect from Google Maps</b><button type="button" className="mini-button" disabled={!!busy} onClick={locate}>{busy==='gps'?'Detecting…':'⌖ Use current location'}</button></div>
  <p className="location-detect-hint">Search and pick a place, or type the address yourself in the Address field above.</p>
  <div className="location-search">
   <input aria-label="Search for your store location" placeholder="Search area, market or landmark" autoComplete="off" maxLength={120} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search();}}}/>
   <button type="button" disabled={!!busy||query.trim().length<3} onClick={()=>void search()}>{busy==='search'?'Searching…':'Search'}</button>
  </div>
  {results.length>0&&<ul className="location-results">{results.map(place=><li key={place.placeId}><button type="button" disabled={!!busy} onClick={()=>void pick(place.placeId)}><b>{place.mainText}</b><small>{place.secondaryText}</small></button></li>)}</ul>}
  <p role="status">{message}</p>
 </div>;
}
export function BusinessForm({business,onSave}:{business:Business;onSave:()=>void}){const [name,setName]=useState(business.name);const [description,setDescription]=useState(business.description);const [address,setAddress]=useState(business.address);const [message,setMessage]=useState('');return <form className="panel business-form" onSubmit={async e=>{e.preventDefault();try{await api('/vendor/profile','PATCH',{name,description,address});setMessage('Business profile saved');onSave();}catch(e){setMessage((e as Error).message);}}}><h2>Business profile</h2><label>Name<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label><label>Description<textarea maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Address<input required maxLength={200} value={address} onChange={e=>setAddress(e.target.value)}/></label><LocationDetect onDetect={setAddress}/><p>{business.city} / {business.zone} · {business.status} · Commission {business.commissionBps/100}%</p><p>Delivery options are set per product in the product catalog.</p><p>Contact your administrator for service-area or commission changes.</p><button className="primary">Save changes</button><p role="status">{message}</p></form>;}
export function Settings(){const user=useVendorUser();const router=useRouter();const [message,setMessage]=useState('');return <section className="panel"><h2>Account settings</h2><p>{user?.email}</p><form className="business-form" onSubmit={async e=>{e.preventDefault();const d=new FormData(e.currentTarget);try{await authRequest('change-password',{currentPassword:d.get('currentPassword'),newPassword:d.get('newPassword')});await authRequest('logout',{});router.replace('/');}catch(e){setMessage((e as Error).message);}}}><label>Current password<PasswordInput name="currentPassword" required type="password" maxLength={72}/></label><label>New password<PasswordInput name="newPassword" required type="password" minLength={12} maxLength={72}/></label><button className="primary">Change password and sign out</button></form><p role="status">{message}</p></section>;}
export function Categories(){const [view,setView]=useState<'grid'|'list'>('grid');const list=useApi<Category[]>('/catalog/categories');return <section className="panel"><div className="panel-heading"><h2>Available categories</h2><ViewSwitch value={view} onChange={setView} label="Categories"/></div><p className="muted">Categories are managed by Barwaqt administrators.</p><State {...list} retry={list.reload}/><div className={`category-collection category-${view}`}>{list.data?.map(c=><article key={c.id}>{c.image?<Image src={c.image} alt="" width={120} height={100} unoptimized style={{objectFit:'contain'}}/>:<div className="category-placeholder" aria-hidden="true">▦</div>}<div><h3>{c.name}</h3><p className="muted">{c.parentSlug?list.data?.find(parent=>parent.slug===c.parentSlug)?.name||c.parentSlug:'Main category'}</p></div></article>)}</div>{!list.loading&&!list.error&&!list.data?.length&&<div className="empty">No categories available yet.</div>}</section>;}


export function Returns(){const [page,setPage]=useState(1);const list=useApi<{items:{id:string;status:string;reason:string;note:string;restocked:boolean;vendorOrderId:string;vendorOrder:{items:{name:string;quantity:number}[]}}[];total:number}>('/returns?page='+page);return <section className="panel"><div className="panel-heading"><div><h2>Customer returns</h2><p className="muted">Track customer requests, review outcomes and stock restoration.</p></div><button className="mini-button" onClick={list.reload}>Refresh</button></div><State {...list} retry={list.reload}/>{list.data?.items.map(r=><article className="return-card" key={r.id}><span className="pill">{r.status.replaceAll('_',' ')}</span><h3>{r.vendorOrder.items.map(i=>`${i.name} × ${i.quantity}`).join(', ')}</h3><p>Shipment {r.vendorOrderId}</p><p>{r.reason}</p><p>{r.note}</p><small>{r.restocked?'Stock restored':'Stock not restored'}</small></article>)}{list.data?.total===0&&<div className="empty"><h3>No return requests</h3><p>Customer return requests for your store will appear here.</p></div>}<div className="live-actions"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button disabled={page*20>=(list.data?.total||0)} onClick={()=>setPage(p=>p+1)}>Next</button></div></section>;}
