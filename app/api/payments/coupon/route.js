import {NextResponse} from "next/server";
import {getUser} from "@/lib/db";
import {loadActivePlan,quotePlan} from "@/lib/payment-engine";
export async function POST(request){
  const user=await getUser(request); if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await request.json(); const plan=await loadActivePlan(body.planId);
  if(!plan||plan.pricePaise<=0) return NextResponse.json({error:"Select a valid paid plan."},{status:400});
  try{const quote=await quotePlan({plan,userId:user.id,couponCode:body.couponCode});return NextResponse.json({planId:plan.id,originalAmountPaise:plan.pricePaise,discountPaise:quote.discountPaise,amountPaise:quote.amountPaise,couponCode:quote.coupon?.code||null});}
  catch(error){return NextResponse.json({error:error.message},{status:400});}
}
