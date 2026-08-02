import {NextResponse} from "next/server";
import {getUser} from "@/lib/db";
import {prisma} from "@/lib/prisma";
import {createRazorpayOrder,loadActivePlan,paymentEngineEnabled,quotePlan,razorpayConfigured,uid} from "@/lib/payment-engine";
import {rateLimit} from "@/lib/security";
export async function POST(request){
 const limited=rateLimit(request,{key:"payment-order",limit:8,windowMs:60000}); if(!limited.allowed)return NextResponse.json({error:"Too many attempts. Please wait."},{status:429});
 const user=await getUser(request); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!paymentEngineEnabled()||!razorpayConfigured())return NextResponse.json({error:"Online payments are temporarily unavailable."},{status:503});
 const body=await request.json(); const plan=await loadActivePlan(body.planId); if(!plan||plan.pricePaise<=0)return NextResponse.json({error:"Select a valid paid plan."},{status:400});
 try{
  const quote=await quotePlan({plan,userId:user.id,couponCode:body.couponCode}); if(quote.amountPaise<100)return NextResponse.json({error:"Payable amount must be at least ₹1."},{status:400});
  const id=uid("pay"), receipt=`MS-${Date.now()}-${user.id.slice(-6)}`.slice(0,40);
  const order=await createRazorpayOrder({amountPaise:quote.amountPaise,receipt,notes:{internal_payment_id:id,user_id:user.id,plan_id:plan.id}});
  await prisma.paymentTransaction.create({data:{id,userId:user.id,planId:plan.id,gateway:"razorpay",gatewayOrderId:order.id,amountPaise:quote.amountPaise,discountPaise:quote.discountPaise,currency:"INR",status:"pending",verificationMetadata:{couponId:quote.coupon?.id||null,couponCode:quote.coupon?.code||null,receipt}}});
  return NextResponse.json({keyId:process.env.RAZORPAY_KEY_ID,orderId:order.id,paymentRecordId:id,amountPaise:quote.amountPaise,currency:"INR",plan:{id:plan.id,name:plan.name}});
 }catch(error){return NextResponse.json({error:error.message||"Unable to start payment."},{status:400});}
}
