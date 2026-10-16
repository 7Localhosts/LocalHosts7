// Verified catalogue image assignments. The local folder is lowercase for case-sensitive production hosts.
const verifiedProductImagesById = new Map([
  ["4", "4-seba-med-cleansing-bar.png"],
  ["6", "6-tommee-tippee-bottle-and-warmer.png"],
  ["7", "7-little-angels-detergent-spray.png"],
  ["8", "8-mermaid-tutu-dress.png"],
  ["13", "13-top-and-shorts-set.png"],
  ["15", "15-pink-baby-layette-bodysuit.png"],
  ["20", "20-dressy-pink-bodysuit.png"],
  ["32", "32-f-f-shorts-and-top-set.png"],
  ["35", "35-mothercare-5pk-white-bodysuit.png"],
  ["39", "39-banana-republic-brown-long-sleeve-romper.png"],
  ["40", "40-polo-shirt.png"],
  ["41", "41-3pk-tu-baby-tops.png"],
  ["44", "44-pink-bunny-overall.png"],
  ["50", "50-seba-med-cleansing-bar.png"],
  ["52", "52-tommee-tipped-bottle-and-warmer.png"],
  ["53", "53-little-angel-baby-shampoo.png"],
  ["54", "54-tommee-tippee-anticolic-bottle.png"],
  ["55", "55-little-angels-detergent-spray.png"],
  ["56", "56-mermaid-tutu-dress.png"],
  ["61", "61-top-n-shorts-set.png"],
  ["63", "63-pink-baby-layette-body-suit.png"],
  ["68", "68-dressy-pink-body-suit.png"],
  ["74", "74-christmas-boys-green-and-red-shirt-n-trousers.png"],
  ["80", "80-f-f-shorts-and-top-set.png"],
  ["83", "83-mother-care-5pk-white-body-suit.png"],
  ["87", "87-banana-republic-brown-long-sleeve-romper.png"],
  ["88", "88-polo-shirt.png"],
  ["89", "89-3pk-tu-baby-tops.png"],
  ["92", "92-pink-bunny-overall.png"],
  ["96", "96-graco-car-seat.png"],
  ["101", "101-white-floral-dress.png"],
  ["105", "105-tb-gold-white-dress.png"],
  ["114", "114-mother-care-top-n-bottom-tiger-set.png"],
  ["119", "119-sonic-top-shorts-jersey-set.png"],
  ["132", "132-boys-4-set-shirt-and-trousers.png"],
  ["133", "133-girls-red-lace-dress.png"],
  ["134", "134-boys-shirt.png"],
  ["135", "135-girls-black-school-shoe.png"],
  ["142", "142-3-set-navy-blue-suits.png"],
  ["144", "144-army-green-unisex-jogger.png"],
  ["146", "146-chicco-next-to-me-baby-scout.png"],
  ["154", "154-jeans-skirt.png"],
  ["164", "164-dream-big-back-pack-set.png"],
  ["167", "167-blue-black-jeans-skirt.png"],
  ["169", "169-game-pad-bottle.png"],
  ["170", "170-green-n-blue-water-bottle.png"],
  ["172", "172-blue-water-bottle.png"],
  ["173", "173-football-water-bottle.png"],
  ["174", "174-red-checkered-dress.png"],
  ["177", "177-smiggle-unicorn-blue-bag.png"],
  ["179", "179-blue-jeans-shorts.png"],
  ["182", "182-aveeno-daily-care-hair-and-bath.png"],
  ["183", "183-boys-blue-bucket-hat-vest-shorts-set.png"],
  ["184", "184-boys-trainer.png"],
  ["187", "187-smiggle-blue-back-pack.png"],
  ["12", "12-yellow-green-top-and-leggings.png"],
  ["60", "60-yellow-green-top-n-leggings.png"],
  ["71", "71-blue-red-3pk-sleep-suit.png"],
  ["125", "125-hover-board.png"],
  ["127", "127-rainbow-ballerina-dress.png"],
  ["138", "138-white-dress.png"],
  ["147", "147-robot-dog.png"],
  ["148", "148-boys-black-suit-3set.png"],
  ["149", "149-kids-harmonica.png"],
  ["150", "150-long-sleeve-white-shirt.png"],
  ["151", "151-long-sleeve-blue-shirt.png"],
  ["152", "152-scooter.png"],
  ["153", "153-tutu-skirt.png"],
  ["175", "175-smiggle-trolley-bag-pink.png"],
  ["176", "176-smiggle-purple-budz-light-up-trolley-bag.png"],
  ["178", "178-2pk-pink-shorts.png"],
  ["190", "190-white-socks-set.png"],
  ["191", "191-boys-blue-shark-croce.png"]
]);

const verifiedProductImageFallbacks = new Map([
  ["sebamedcleansingbar", "4-seba-med-cleansing-bar.png"],
  ["tommeetippeebottleandwarmer", "6-tommee-tippee-bottle-and-warmer.png"],
  ["littleangelsdetergentspray", "7-little-angels-detergent-spray.png"],
  ["mermaidtutudress", "8-mermaid-tutu-dress.png"],
  ["topandshortsset", "13-top-and-shorts-set.png"],
  ["pinkbabylayettebodysuit", "15-pink-baby-layette-bodysuit.png"],
  ["dressypinkbodysuit", "20-dressy-pink-bodysuit.png"],
  ["ffshortsandtopset", "32-f-f-shorts-and-top-set.png"],
  ["mothercare5pkwhitebodysuit", "35-mothercare-5pk-white-bodysuit.png"],
  ["bananarepublicbrownlongsleeveromper", "39-banana-republic-brown-long-sleeve-romper.png"],
  ["poloshirt", "40-polo-shirt.png"],
  ["3pktubabytops", "41-3pk-tu-baby-tops.png"],
  ["pinkbunnyoverall", "44-pink-bunny-overall.png"],
  ["tommeetippedbottleandwarmer", "52-tommee-tipped-bottle-and-warmer.png"],
  ["littleangelbabyshampoo", "53-little-angel-baby-shampoo.png"],
  ["tommeetippeeanticolicbottle", "54-tommee-tippee-anticolic-bottle.png"],
  ["topnshortsset", "61-top-n-shorts-set.png"],
  ["christmasboysgreenandredshirtntrousers", "74-christmas-boys-green-and-red-shirt-n-trousers.png"],
  ["gracocarseat", "96-graco-car-seat.png"],
  ["whitefloraldress", "101-white-floral-dress.png"],
  ["tbgoldwhitedress", "105-tb-gold-white-dress.png"],
  ["mothercaretopnbottomtigerset", "114-mother-care-top-n-bottom-tiger-set.png"],
  ["sonictopshortsjerseyset", "119-sonic-top-shorts-jersey-set.png"],
  ["boys4setshirtandtrousers", "132-boys-4-set-shirt-and-trousers.png"],
  ["girlsredlacedress", "133-girls-red-lace-dress.png"],
  ["boysshirt", "134-boys-shirt.png"],
  ["girlsblackschoolshoe", "135-girls-black-school-shoe.png"],
  ["3setnavybluesuits", "142-3-set-navy-blue-suits.png"],
  ["armygreenunisexjogger", "144-army-green-unisex-jogger.png"],
  ["chicconexttomebabyscout", "146-chicco-next-to-me-baby-scout.png"],
  ["jeansskirt", "154-jeans-skirt.png"],
  ["dreambigbackpackset", "164-dream-big-back-pack-set.png"],
  ["blueblackjeansskirt", "167-blue-black-jeans-skirt.png"],
  ["gamepadbottle", "169-game-pad-bottle.png"],
  ["greennbluewaterbottle", "170-green-n-blue-water-bottle.png"],
  ["bluewaterbottle", "172-blue-water-bottle.png"],
  ["footballwaterbottle", "173-football-water-bottle.png"],
  ["redcheckereddress", "174-red-checkered-dress.png"],
  ["smiggleunicornbluebag", "177-smiggle-unicorn-blue-bag.png"],
  ["bluejeansshorts", "179-blue-jeans-shorts.png"],
  ["aveenodailycarehairandbath", "182-aveeno-daily-care-hair-and-bath.png"],
  ["boysbluebuckethatvestshortsset", "183-boys-blue-bucket-hat-vest-shorts-set.png"],
  ["boystrainer", "184-boys-trainer.png"],
  ["smigglebluebackpack", "187-smiggle-blue-back-pack.png"],
  ["yellowgreentopandleggings", "12-yellow-green-top-and-leggings.png"],
  ["yellowgreentopnleggings", "60-yellow-green-top-n-leggings.png"],
  ["hoverboard", "125-hover-board.png"],
  ["rainbowballerinadress", "127-rainbow-ballerina-dress.png"],
  ["whitedress", "138-white-dress.png"],
  ["robotdog", "147-robot-dog.png"],
  ["boysblacksuit3set", "148-boys-black-suit-3set.png"],
  ["kidsharmonica", "149-kids-harmonica.png"],
  ["longsleevewhiteshirt", "150-long-sleeve-white-shirt.png"],
  ["longsleeveblueshirt", "151-long-sleeve-blue-shirt.png"],
  ["scooter", "152-scooter.png"],
  ["tutuskirt", "153-tutu-skirt.png"],
  ["smiggletrolleybagpink", "175-smiggle-trolley-bag-pink.png"],
  ["smigglepurplebudzlightuptrolleybag", "176-smiggle-purple-budz-light-up-trolley-bag.png"],
  ["2pkpinkshorts", "178-2pk-pink-shorts.png"],
  ["whitesocksset", "190-white-socks-set.png"],
  ["boysbluesharkcroce", "191-boys-blue-shark-croce.png"]
]);

// Product 51's prior edited source is absent from the current image set.
const unavailableVerifiedSourcePaths = new Set([
  "Images/catalog-cleaned/little-angel.jpg",
  "images/catalog-cleaned/little-angel.jpg"
]);

function productImageUrl(product, prefix = "images/") {
  if (!product) return "";

  const rawImage = typeof product.image === "string" ? product.image.trim().replace(/\\/g, "/") : "";
  const image = rawImage.replace(/^(\.\.\/)+/, "");
  // A saved Supabase URL is the catalogue source of truth and must take
  // precedence over legacy, local-only verified assignments.
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  const id = String(product.id ?? product.product_id ?? "");
  const imageKey = image.toLowerCase();

  if (unavailableVerifiedSourcePaths.has(imageKey)) return "";

  const verifiedFile = verifiedProductImagesById.get(id);
  if (verifiedFile) {
    return prefix + verifiedFile;
  }

  if (!image) {
    const nameKey = String(product.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const fallbackFile = verifiedProductImageFallbacks.get(nameKey);
    return fallbackFile ? prefix + fallbackFile : "";
  }

  if (image.startsWith("/")) return image;
  const relativePath = image.replace(/^(\.\.\/)+/, "");
  if (/^images\/catalog-cleaned\//i.test(relativePath)) return "";
  if (/^images\//i.test(relativePath)) return prefix + relativePath.slice("images/".length);
  if (/^catalog-cleaned\//i.test(relativePath)) return "";
  return prefix + relativePath;
}

function productImageLoads(url, timeoutMs = 15000) {
  if (!url || typeof Image === "undefined") return Promise.resolve(false);
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = loaded => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(Boolean(loaded && image.naturalWidth > 0 && image.naturalHeight > 0));
    };
    const timeout = setTimeout(() => finish(false), timeoutMs);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = url;
    if (image.complete) finish(true);
  });
}

function productSizeOptions(product) {
  const recorded = Array.isArray(product?.sizes)
    ? product.sizes.map(size => String(size).trim()).filter(Boolean)
    : [];
  if (recorded.length) return recorded.filter(size => !/^(none|n\/a|na)$/i.test(size));
  const category = String(product?.category || "").trim().toLowerCase();
  const name = String(product?.name || "").trim().toLowerCase();
  if (["toys", "accessories"].includes(category)) return [];
  const clothing = /\b(dress|romper|bodysuit|body suit|sleep ?suit|sleepsuit|t[ -]?shirt|tee|shirt|top|shorts?|pants|trousers|leggings|joggers|sweater|jumper|hoodie|jacket|coat|skirt|pajamas?|pyjamas?|polo|uniform|onesie|overall|cardigan|gown|tunic|baby ?grow|outfit)\b/i;
  return clothing.test(name) ? ["S", "M", "L", "XL"] : [];
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { productImageUrl, productImageLoads, productSizeOptions };
}
