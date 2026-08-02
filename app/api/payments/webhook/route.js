import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {activateMembership,verifyWebhookSignature} from "@/lib/payment-engine";
export async function POST(request){
 const raw=await request.text(); const signature=request.headers.get("x-razorpay-signature")||"";
 if(!process.env.RAZORPAY_WEBHOOK_SECRET||!verifyWebhookSignature(raw,signature))return NextResponse.json({error:"Invalid webhook signature."},{status:401});
 let payload; try{payload=JSON.parse(raw);}catch{return NextResponse.json({error:"Invalid payload."},{status:400});}
 const event=payload.event; if(!["payment.captured","order.paid"].includes(event))return NextResponse.json({received:true,ignored:true});
 const payment=payload.payload?.payment?.entity; const order=payload.payload?.order?.entity; const orderId=payment?.order_id||order?.id; const gatewayPaymentId=payment?.id;
 if(!orderId)return NextResponse.json({received:true,ignored:true});
 const record=await prisma.paymentTransaction.findUnique({where:{gatewayOrderId:orderId}}); if(!record)return NextResponse.json({received:true,unmatched:true});
 const paidAmount=Number(payment?.amount ?? order?.amount_paid ?? order?.amount);
 const paidCurrency=String(payment?.currency ?? order?.currency ?? "").toUpperCase();
 if(Number.isFinite(paidAmount)&&paidAmount!==record.amountPaise)return NextResponse.json({error:"Payment amount mismatch."},{status:409});
 if(paidCurrency&&paidCurrency!==String(record.currency||"").toUpperCase())return NextResponse.json({error:"Payment currency mismatch."},{status:409});
 try{await activateMembership({paymentId:record.id,gatewayPaymentId,verificationMetadata:{...(record.verificationMetadata||{}),verifiedBy:"webhook",event,verifiedAt:new Date().toISOString()}});return NextResponse.json({received:true,activated:true});}
 catch(error){return NextResponse.json({error:error.message},{status:409});}
}
