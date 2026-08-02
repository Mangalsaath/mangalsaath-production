import { NextResponse } from "next/server";
import { readDb,writeDb,getUser } from "@/lib/db";

export async function GET(request){
  const user=await getUser(request); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=await readDb();
  const notifications=(db.notifications||[]).filter(n=>n.userId===user.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  return NextResponse.json({notifications,unread:notifications.filter(n=>!n.read).length});
}
export async function PATCH(request){
  const user=await getUser(request); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id,all}=await request.json(); const db=await readDb(); let changed=0;
  db.notifications=(db.notifications||[]).map(n=>{if(n.userId===user.id&&(all||n.id===id)){changed++;return {...n,read:true,readAt:new Date().toISOString()}}return n});
  await writeDb(db); return NextResponse.json({changed});
}
