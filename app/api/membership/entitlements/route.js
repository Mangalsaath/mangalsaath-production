import {NextResponse} from "next/server";
import {getUser} from "@/lib/db";
import {getActiveEntitlements} from "@/lib/entitlements";
export async function GET(request){const user=await getUser(request);if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});try{const result=await getActiveEntitlements(user.id);return NextResponse.json(result||{membership:null,plan:null,permissions:null,mode:"legacy"},{headers:{"Cache-Control":"private, no-store"}})}catch{return NextResponse.json({error:"Unable to load membership permissions."},{status:503})}}
