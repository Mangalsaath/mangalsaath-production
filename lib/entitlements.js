import {prisma} from "@/lib/prisma";
import {planPermissions,paymentEngineEnabled} from "@/lib/payment-engine";

export async function getActiveEntitlements(userId){
  if(!paymentEngineEnabled()) return null;
  const now=new Date();
  const membership=await prisma.userMembership.findFirst({where:{userId,status:"active",OR:[{expiresAt:null},{expiresAt:{gt:now}}]},orderBy:{startsAt:"desc"},include:{plan:{include:{features:true}}}});
  if(!membership) return {membership:null,plan:null,permissions:{}};
  return {membership,plan:membership.plan,permissions:planPermissions(membership.plan)};
}

export function permissionAllows(permissions,key,used=0){
  const value=permissions?.[key];
  if(value===true||value===-1) return {allowed:true,unlimited:true,limit:value};
  if(Number.isFinite(value)) return {allowed:used<value,unlimited:false,limit:value,remaining:Math.max(0,value-used)};
  return {allowed:false,unlimited:false,limit:0,remaining:0};
}
