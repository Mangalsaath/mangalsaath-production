import fs from "node:fs";
const checks=[
 ["app/page.js","startOnlinePayment"],
 ["app/api/payments/order/route.js","createRazorpayOrder"],
 ["app/api/payments/verify/route.js","verifyCheckoutSignature"],
 ["app/api/membership/entitlements/route.js","getActiveEntitlements"],
 ["lib/entitlements.js","expiresAt:{gt:now}"]
];
let failed=0;for(const [file,text] of checks){const body=fs.readFileSync(file,"utf8");if(!body.includes(text)){console.error(`FAIL ${file}: ${text}`);failed++}else console.log(`PASS ${file}`)}if(failed)process.exit(1);console.log("Secure checkout and entitlement structure verified.");
