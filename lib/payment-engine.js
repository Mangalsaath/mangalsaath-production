import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const PERMISSIONS = ["profileViews","interests","messages","advancedSearch","priority","contactDetails"];
export function paymentEngineEnabled(){ return String(process.env.PAYMENT_ENGINE_ENABLED || "false").toLowerCase() === "true"; }
export function razorpayConfigured(){ return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET); }
export function uid(prefix){ return `${prefix}_${crypto.randomBytes(8).toString("hex")}`; }
export function normalizeCoupon(code){ return String(code||"").trim().toUpperCase(); }

export async function loadActivePlan(planId){
  return prisma.membershipPlan.findFirst({where:{id:String(planId),active:true},include:{features:true}});
}
export async function quotePlan({plan,userId,couponCode}){
  let coupon=null, discountPaise=0;
  const code=normalizeCoupon(couponCode);
  if(code){
    coupon=await prisma.coupon.findUnique({where:{code},include:{plans:true}});
    const now=new Date();
    if(!coupon||!coupon.active) throw new Error("Invalid or inactive coupon code.");
    if(coupon.startsAt&&coupon.startsAt>now) throw new Error("This coupon is not active yet.");
    if(coupon.endsAt&&coupon.endsAt<now) throw new Error("This coupon has expired.");
    if(coupon.plans.length&&!coupon.plans.some(x=>x.planId===plan.id)) throw new Error("This coupon is not valid for the selected plan.");
    const total=await prisma.couponRedemption.count({where:{couponId:coupon.id}});
    if(coupon.maxUses>0&&total>=coupon.maxUses) throw new Error("This coupon has reached its usage limit.");
    const own=await prisma.couponRedemption.count({where:{couponId:coupon.id,userId}});
    if(own>=Math.max(1,coupon.usesPerUser)) throw new Error("This coupon has already been used on this account.");
    discountPaise=coupon.discountType==="fixed"
      ? Math.min(plan.pricePaise,coupon.discountValue)
      : Math.min(plan.pricePaise,Math.round(plan.pricePaise*(coupon.discountValue/100)));
  }
  return {coupon,discountPaise,amountPaise:Math.max(0,plan.pricePaise-discountPaise)};
}
export async function createRazorpayOrder({amountPaise,currency="INR",receipt,notes={}}){
  if(!razorpayConfigured()) throw new Error("Razorpay is not configured.");
  const auth=Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/json"},body:JSON.stringify({amount:amountPaise,currency,receipt,notes})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.id) throw new Error(data?.error?.description||"Unable to create payment order.");
  return data;
}
export function verifyCheckoutSignature({orderId,paymentId,signature}){
  const expected=crypto.createHmac("sha256",String(process.env.RAZORPAY_KEY_SECRET||"")).update(`${orderId}|${paymentId}`).digest("hex");
  const a=Buffer.from(expected,"utf8"), b=Buffer.from(String(signature||""),"utf8");
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function verifyWebhookSignature(rawBody,signature){
  const expected=crypto.createHmac("sha256",String(process.env.RAZORPAY_WEBHOOK_SECRET||"")).update(rawBody).digest("hex");
  const a=Buffer.from(expected,"utf8"), b=Buffer.from(String(signature||""),"utf8");
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export async function activateMembership({paymentId,gatewayPaymentId=null,reviewedBy=null,verificationMetadata={}}){
  return prisma.$transaction(async tx=>{
    const payment=await tx.paymentTransaction.findUnique({where:{id:paymentId},include:{plan:true}});
    if(!payment||!payment.userId||!payment.plan) throw new Error("Payment record is incomplete.");
    if(payment.status==="paid") return payment;
    if(payment.status!=="pending") throw new Error("This payment is no longer awaiting verification.");
    if(payment.amountPaise<0||payment.discountPaise<0||payment.discountPaise>payment.plan.pricePaise) throw new Error("Payment pricing data is invalid.");
    if(String(payment.currency||"").toUpperCase()!=="INR") throw new Error("Unsupported payment currency.");

    const now=new Date();
    const activeMembership=await tx.userMembership.findFirst({
      where:{userId:payment.userId,status:"active"},
      orderBy:{createdAt:"desc"}
    });
    const isSamePlanRenewal=activeMembership?.planId===payment.planId;
    const renewalBase=isSamePlanRenewal&&activeMembership?.expiresAt&&activeMembership.expiresAt>now
      ? activeMembership.expiresAt
      : now;
    const expiresAt=payment.plan.durationDays>0
      ? new Date(renewalBase.getTime()+payment.plan.durationDays*86400000)
      : null;

    const changed=await tx.paymentTransaction.updateMany({
      where:{id:payment.id,status:"pending"},
      data:{
        status:"paid",
        gatewayPaymentId:gatewayPaymentId||payment.gatewayPaymentId||null,
        verificationMetadata,
        reviewedBy:reviewedBy||payment.reviewedBy||null,
        reviewedAt:now
      }
    });
    if(changed.count!==1) throw new Error("This payment has already been reviewed.");

    await tx.userMembership.updateMany({
      where:{userId:payment.userId,status:"active"},
      data:{status:"replaced",cancelledAt:now,cancellationNote:isSamePlanRenewal?"Renewed by a newer paid membership.":"Replaced by a newer paid membership."}
    });
    await tx.userMembership.create({
      data:{id:uid("mem"),userId:payment.userId,planId:payment.planId,paymentId:payment.id,status:"active",startsAt:now,expiresAt}
    });
    await tx.user.update({where:{id:payment.userId},data:{membership:payment.plan.name,membershipPlanId:payment.plan.id}});

    const couponId=verificationMetadata?.couponId;
    if(couponId&&payment.discountPaise>0){
      const coupon=await tx.coupon.findUnique({where:{id:couponId}});
      if(!coupon||!coupon.active) throw new Error("The applied coupon is no longer valid.");
      const nowCheck=new Date();
      if(coupon.startsAt&&coupon.startsAt>nowCheck) throw new Error("The applied coupon is not active yet.");
      if(coupon.endsAt&&coupon.endsAt<nowCheck) throw new Error("The applied coupon has expired.");
      const total=await tx.couponRedemption.count({where:{couponId}});
      if(coupon.maxUses>0&&total>=coupon.maxUses) throw new Error("The applied coupon has reached its usage limit.");
      const own=await tx.couponRedemption.count({where:{couponId,userId:payment.userId}});
      if(own>=Math.max(1,coupon.usesPerUser)) throw new Error("The applied coupon has already been used on this account.");
      await tx.couponRedemption.create({data:{id:uid("redeem"),couponId,userId:payment.userId,paymentId:payment.id,discountPaise:payment.discountPaise}});
    }
    return tx.paymentTransaction.findUnique({where:{id:payment.id}});
  });
}
export function planPermissions(plan){
  const result={}; for(const key of PERMISSIONS) result[key]=false;
  for(const item of plan?.features||[]) result[item.permissionKey]=item.numericLimit??item.enabled;
  return result;
}
