import {NextResponse} from "next/server";
import {getUser} from "@/lib/db";
import {prisma} from "@/lib/prisma";
import {activateMembership,verifyCheckoutSignature} from "@/lib/payment-engine";
export async function POST(request){
 const user=await getUser(request); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await request.json(); const orderId=String(body.razorpay_order_id||""), paymentId=String(body.razorpay_payment_id||""), signature=String(body.razorpay_signature||"");
 const record=await prisma.paymentTransaction.findFirst({where:{gatewayOrderId:orderId,userId:user.id}}); if(!record)return NextResponse.json({error:"Payment order not found."},{status:404});
 if(!verifyCheckoutSignature({orderId,paymentId,signature}))return NextResponse.json({error:"Payment signature verification failed."},{status:400});
 try{const metadata={...(record.verificationMetadata||{}),verifiedBy:"checkout",verifiedAt:new Date().toISOString()};await activateMembership({paymentId:record.id,gatewayPaymentId:paymentId,verificationMetadata:metadata});return NextResponse.json({message:"Payment verified and membership activated.",membershipActivated:true});}
 catch(error){return NextResponse.json({error:error.message||"Membership activation failed."},{status:409});}
}
