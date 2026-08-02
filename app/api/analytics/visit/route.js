import crypto from "crypto";
import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { rateLimit } from "@/lib/security";

export async function POST(request){
  const limited=rateLimit(request,{key:"homepage-visit",limit:30,windowMs:60_000});
  if(!limited.allowed)return NextResponse.json({ok:true});
  let body={};try{body=await request.json()}catch{}
  const raw=String(body.visitorId||"").slice(0,160);
  if(!raw)return NextResponse.json({ok:true});
  const visitorId=crypto.createHash("sha256").update(raw).digest("hex");
  const db=await readDb();
  const now=new Date();
  const day=now.toISOString().slice(0,10);
  db.analytics=db.analytics||{totalVisits:0,uniqueVisitors:0,daily:{},visitors:{}};
  db.analytics.daily=db.analytics.daily||{}; db.analytics.visitors=db.analytics.visitors||{};
  db.analytics.totalVisits=(db.analytics.totalVisits||0)+1;
  const isNew=!db.analytics.visitors[visitorId];
  if(isNew){db.analytics.visitors[visitorId]={firstSeenAt:now.toISOString(),lastSeenAt:now.toISOString()};db.analytics.uniqueVisitors=(db.analytics.uniqueVisitors||0)+1;}
  else db.analytics.visitors[visitorId].lastSeenAt=now.toISOString();
  const daily=db.analytics.daily[day]||{visits:0,uniqueVisitors:0,visitorIds:{}};
  daily.visits=(daily.visits||0)+1; daily.visitorIds=daily.visitorIds||{};
  if(!daily.visitorIds[visitorId]){daily.visitorIds[visitorId]=true;daily.uniqueVisitors=(daily.uniqueVisitors||0)+1;}
  db.analytics.daily[day]=daily;
  const keep=Object.keys(db.analytics.daily).sort().slice(-120);db.analytics.daily=Object.fromEntries(keep.map(k=>[k,db.analytics.daily[k]]));
  await writeDb(db);
  return NextResponse.json({ok:true});
}
