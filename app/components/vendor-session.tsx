'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {authRequest,type AccountUser} from './auth-client';
const Context=createContext<AccountUser|null>(null);
export const useVendorUser=()=>useContext(Context);
export default function VendorSession({children}:{children:React.ReactNode}){const [user,setUser]=useState<AccountUser|null>(null);const router=useRouter();useEffect(()=>{let active=true;authRequest<AccountUser>('me').then(user=>{if(user.role!=='VENDOR')throw new Error('Vendor account required');if(active)setUser(user);}).catch(()=>router.replace('/'));return()=>{active=false;};},[router]);return user?<Context.Provider value={user}>{children}</Context.Provider>:<main style={{padding:40}}>Checking your account…</main>;}
