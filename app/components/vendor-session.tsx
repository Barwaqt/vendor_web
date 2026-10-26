 'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {authRequest,AuthError,type AccountUser} from './auth-client';
import {BrandLoader} from './brand-loader';
const Context=createContext<AccountUser|null>(null);
export const useVendorUser=()=>useContext(Context);
export default function VendorSession({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<AccountUser|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);const router=useRouter();
 useEffect(()=>{let active=true;authRequest<AccountUser>('me').then(user=>{if(!active)return;if(user.role!=='VENDOR'){router.replace('/');return;}setUser(user);}).catch(e=>{if(!active)return;if(e instanceof AuthError&&(e.status===401||e.status===403))router.replace('/');else setError('Unable to check your session. Please retry.');});return()=>{active=false;};},[router,attempt]);
 if(error)return <main><p role="alert">{error}</p><button onClick={()=>{setError('');setAttempt(v=>v+1);}}>Retry</button></main>;
 return user?<Context.Provider value={user}>{children}</Context.Provider>:<BrandLoader label="Checking your account…"/>;
}
