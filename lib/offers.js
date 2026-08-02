function validDate(value){
  if(!value)return null;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?null:date;
}

export function isCouponAvailable(coupon,now=new Date()){
  if(!coupon||coupon.active===false)return false;
  const start=validDate(coupon.startAt),end=validDate(coupon.endAt);
  return (!start||start<=now)&&(!end||end>=now);
}

export function isOfferVisible(offer,now=new Date()){
  if(!offer||offer.active===false||offer.status!=="approved")return false;
  const start=validDate(offer.startAt),end=validDate(offer.endAt);
  return (!start||start<=now)&&(!end||end>=now);
}

export function getActiveCoupons(db,now=new Date()){
  return (db.coupons||[]).filter(c=>isCouponAvailable(c,now));
}

export function resolveOffer(db,offer){
  if(!offer)return null;
  const couponCode=String(offer.couponCode||"").trim().toUpperCase();
  const coupon=couponCode?(db.coupons||[]).find(c=>String(c.code||"").toUpperCase()===couponCode):null;
  return {
    ...offer,
    couponCode:coupon?.code||couponCode,
    discountType:coupon?.discountType||offer.discountType||"text",
    discountValue:coupon?Number(coupon.discountValue||0):Number(offer.discountValue||0),
    applicablePlanIds:coupon?.applicablePlanIds||[],
    couponActive:coupon?coupon.active!==false:null
  };
}

export function getVisibleOffers(db,now=new Date()){
  return (db.homepageOffers||[])
    .filter(offer=>isOfferVisible(offer,now))
    .map(offer=>resolveOffer(db,offer))
    .filter(offer=>!offer.couponCode||offer.couponActive!==false)
    .sort((a,b)=>(Number(a.priority)||999)-(Number(b.priority)||999)||new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
}
