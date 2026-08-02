import { NextResponse } from "next/server";
import { readDb, writeDb, getUser, uid } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { relationalProfileEnabled } from "@/lib/relational-profile";
import { appendAdminAudit } from "@/lib/admin-audit";

function auditHistory(logs) {
 return logs.map((log)=>({
  id:log.id,profileId:log.entityId,userId:log.actorUserId,actorUserId:log.actorUserId,
  action:log.action.replace(/^profile\.verification\./,""),note:String(log.metadata?.note||""),
  documentType:String(log.metadata?.documentType||""),documentLast4:String(log.metadata?.documentLast4||""),
  createdAt:log.createdAt?.toISOString?.()||log.createdAt
 }));
}

export async function GET(request){
 const user=await getUser(request); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(relationalProfileEnabled()){
  const profile=await prisma.memberProfile.findUnique({where:{userId:user.id}}); if(!profile)return NextResponse.json({error:"Profile not found."},{status:404});
  const logs=await prisma.adminAuditLog.findMany({where:{entityType:"MemberProfile",entityId:profile.id,action:{startsWith:"profile.verification."}},orderBy:{createdAt:"desc"},take:50});
  const history=auditHistory(logs); const requestLog=history.find((item)=>item.action==="requested"); const reviewLog=history.find((item)=>["approve","reject","request-info"].includes(item.action));
  return NextResponse.json({verification:{status:profile.verificationStatus||"not-requested",documentType:requestLog?.documentType||"",documentLast4:requestLog?.documentLast4||"",note:reviewLog?.note||"",requestedAt:requestLog?.createdAt||null,reviewedAt:reviewLog?.createdAt||null,trusted:Boolean(profile.trustedProfile)},history},{headers:{"Cache-Control":"private, no-store"}});
 }
 const db=await readDb(); const profile=db.profiles.find(p=>p.userId===user.id); if(!profile)return NextResponse.json({error:"Profile not found."},{status:404});
 const history=(db.verificationAudits||[]).filter(a=>a.profileId===profile.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 return NextResponse.json({verification:{status:profile.verificationStatus||"not-requested",documentType:profile.verificationDocumentType||"",documentLast4:profile.verificationDocumentLast4||"",note:profile.verificationNote||"",requestedAt:profile.verificationRequestedAt||null,reviewedAt:profile.verificationReviewedAt||null,trusted:Boolean(profile.trustedProfile)},history});
}

export async function POST(request){
 const user=await getUser(request); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await request.json().catch(()=>({}));
 const documentType=String(body.documentType||"").trim(); const documentLast4=String(body.documentLast4||"").replace(/\D/g,"").slice(-4);
 if(!["Aadhaar","Passport","Driving Licence","Voter ID"].includes(documentType))return NextResponse.json({error:"Select a valid identity document type."},{status:400});
 if(documentLast4.length!==4)return NextResponse.json({error:"Enter the last 4 digits/characters of the document number."},{status:400});
 if(relationalProfileEnabled()){
  const profile=await prisma.memberProfile.findUnique({where:{userId:user.id}}); if(!profile)return NextResponse.json({error:"Profile not found."},{status:404});
  const fields=["name","gender","dateOfBirth","maritalStatus","height","religion","caste","education","profession","country","state","city","about"];
  const completion=Math.round(fields.filter((key)=>profile[key]!==null&&profile[key]!==undefined&&String(profile[key]).trim()).length/fields.length*100);
  if(completion<80)return NextResponse.json({error:"Please complete at least 80% of your profile before requesting verification."},{status:400});
  if(profile.verificationStatus==="requested")return NextResponse.json({error:"Verification is already under review."},{status:409});
  if(profile.verified||profile.verificationStatus==="approved")return NextResponse.json({error:"Profile is already verified."},{status:409});
  await prisma.$transaction(async(tx)=>{
   await tx.memberProfile.update({where:{id:profile.id},data:{verificationStatus:"requested",trustedProfile:false}});
   await appendAdminAudit({actorUserId:user.id,action:"profile.verification.requested",entityType:"MemberProfile",entityId:profile.id,metadata:{documentType,documentLast4,note:String(body.note||"").trim().slice(0,500)}},tx);
  });
  return NextResponse.json({message:"Identity verification request submitted for admin review.",status:"requested"},{headers:{"Cache-Control":"no-store"}});
 }
 const db=await readDb(); const index=db.profiles.findIndex(p=>p.userId===user.id); if(index<0)return NextResponse.json({error:"Profile not found."},{status:404});
 const profile=db.profiles[index];
 const fields=["name","gender","dateOfBirth","maritalStatus","height","religion","caste","education","profession","country","state","city","about"];
 const completion=Math.round(fields.filter(k=>String(profile[k]||"").trim()).length/fields.length*100);
 if(completion<80)return NextResponse.json({error:"Please complete at least 80% of your profile before requesting verification."},{status:400});
 if(profile.verificationStatus==="requested")return NextResponse.json({error:"Verification is already under review."},{status:409});
 if(profile.verified||profile.verificationStatus==="approved")return NextResponse.json({error:"Profile is already verified."},{status:409});
 const now=new Date().toISOString();
 Object.assign(profile,{verificationStatus:"requested",verificationRequestedAt:now,verificationReviewedAt:null,verificationReviewedBy:null,verificationNote:"",verificationDocumentType:documentType,verificationDocumentLast4:documentLast4,trustedProfile:false});
 db.verificationAudits=db.verificationAudits||[];
 db.verificationAudits.unshift({id:uid("va"),profileId:profile.id,userId:user.id,actorUserId:user.id,action:"requested",note:`${documentType} ending ${documentLast4}`,createdAt:now});
 db.activities=db.activities||[]; db.activities.unshift({id:uid("a"),type:"verification_requested",userId:user.id,profileId:profile.id,description:`${profile.name} requested identity verification`,createdAt:now});
 await writeDb(db); return NextResponse.json({message:"Identity verification request submitted for admin review.",status:"requested"});
}
