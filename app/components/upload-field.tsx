"use client";
import {useState} from 'react';
import {api} from './commerce-client';
async function readFileAsBase64(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]);
    reader.onerror=()=>reject(new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}
export function UploadField({onUploaded,kind='IMAGE',multiple=false}:{onUploaded:(urls:string[]) => void;kind?:'IMAGE'|'DOCUMENT';multiple?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const accept = kind==='IMAGE' ? 'image/png,image/jpeg,image/webp' : 'application/pdf';
 const inputProps = {
    type:'file',
    disabled:busy,
    accept,
    multiple,
    onChange: async (e:React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (!files.length) return;
      if (files.some(f => f.size > 5 * 1024 * 1024)) {
        setMessage('Maximum file size is 5 MB per image.');
        return;
      }
      setBusy(true);
      setMessage('');
      const uploadedUrls: string[] = [];
      const failures: string[] = [];
      try {
        for (const file of files) {
          try {
            const data = await readFileAsBase64(file);
            const row = await api<{url:string}>('/uploads', 'POST', { filename: file.name, kind, data });
            uploadedUrls.push(row.url);
          } catch (err) {
            failures.push(`${file.name}: ${(err as Error).message}`);
          }
        }
        if (uploadedUrls.length > 0) {
          onUploaded(uploadedUrls);
          setMessage(`${uploadedUrls.length} file(s) uploaded. Save your changes to attach them.`);
        }
        if (failures.length > 0) {
          setMessage(msg => msg + (msg ? ' ' : '') + failures.join('; '));
        }
      } finally {
        setBusy(false);
      }
    },
  };
  return (
    <label style={{display:'flex',flexDirection:multiple?'column':'row',alignItems:multiple?'flex-start':'center',gap:multiple?8:12}}>
      {multiple ? (
        <>
          <span style={{fontWeight:600,marginBottom:4}}>Upload {kind==='IMAGE'?'images':'PDF documents'}</span>
          <input {...inputProps} />
        </>
      ) : (
        <>
          Upload {kind==='IMAGE'?'image':'PDF document'}
          <input {...inputProps} />
        </>
      )
      }
      <small role="status" style={{width:'100%',marginTop:multiple?4:0}}>{busy ? 'Uploading…' : message}</small>
    </label>
  );
}
