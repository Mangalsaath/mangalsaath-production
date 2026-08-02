import { NextResponse } from "next/server";
import { getPublicSiteSettings } from "@/lib/settings-service";
export async function GET(){
  const settings=await getPublicSiteSettings();
  return NextResponse.json(settings,{headers:{"Cache-Control":"no-store"}});
}
