-- Update only exact, visually verified catalogue rows after the renamed files ship.
-- This migration changes image paths only; product details and inventory remain untouched.
DO $migration$
DECLARE
  expected_rows integer := 55;
  unresolved_rows integer;
BEGIN
  IF (SELECT count(*) FROM public.products p JOIN (VALUES
    (4::bigint, 'Seba Med Cleansing Bar', 'images/4-seba-med-cleansing-bar.png'),
    (6::bigint, 'Tommee Tippee Bottle and Warmer', 'images/6-tommee-tippee-bottle-and-warmer.png'),
    (7::bigint, 'Little Angels Detergent Spray', 'images/7-little-angels-detergent-spray.png'),
    (8::bigint, 'Mermaid Tutu Dress', 'images/8-mermaid-tutu-dress.png'),
    (13::bigint, 'Top and Shorts Set', 'images/13-top-and-shorts-set.png'),
    (15::bigint, 'Pink Baby Layette Bodysuit', 'images/15-pink-baby-layette-bodysuit.png'),
    (20::bigint, 'Dressy Pink Bodysuit', 'images/20-dressy-pink-bodysuit.png'),
    (32::bigint, 'F&F Shorts and Top Set', 'images/32-f-f-shorts-and-top-set.png'),
    (35::bigint, 'Mothercare 5pk White Bodysuit', 'images/35-mothercare-5pk-white-bodysuit.png'),
    (39::bigint, 'Banana Republic Brown Long Sleeve Romper', 'images/39-banana-republic-brown-long-sleeve-romper.png'),
    (40::bigint, 'Polo Shirt', 'images/40-polo-shirt.png'),
    (41::bigint, '3pk TU Baby Tops', 'images/41-3pk-tu-baby-tops.png'),
    (44::bigint, 'Pink Bunny Overall', 'images/44-pink-bunny-overall.png'),
    (50::bigint, 'Seba med cleansing bar', 'images/50-seba-med-cleansing-bar.png'),
    (52::bigint, 'Tommee tipped bottle and warmer', 'images/52-tommee-tipped-bottle-and-warmer.png'),
    (53::bigint, 'Little angel baby shampoo', 'images/53-little-angel-baby-shampoo.png'),
    (54::bigint, 'Tommee tippee Anticolic bottle', 'images/54-tommee-tippee-anticolic-bottle.png'),
    (55::bigint, 'Little angels detergent spray', 'images/55-little-angels-detergent-spray.png'),
    (56::bigint, 'Mermaid tutu dress', 'images/56-mermaid-tutu-dress.png'),
    (61::bigint, 'Top n shorts set', 'images/61-top-n-shorts-set.png'),
    (63::bigint, 'Pink baby layette body suit', 'images/63-pink-baby-layette-body-suit.png'),
    (68::bigint, 'Dressy pink body suit', 'images/68-dressy-pink-body-suit.png'),
    (74::bigint, 'Christmas boys green and red shirt n trousers', 'images/74-christmas-boys-green-and-red-shirt-n-trousers.png'),
    (80::bigint, 'F&f shorts and top set', 'images/80-f-f-shorts-and-top-set.png'),
    (83::bigint, 'Mother care 5pk white body suit', 'images/83-mother-care-5pk-white-body-suit.png'),
    (87::bigint, 'Banana Republic brown long sleeve romper', 'images/87-banana-republic-brown-long-sleeve-romper.png'),
    (88::bigint, 'Polo shirt', 'images/88-polo-shirt.png'),
    (89::bigint, '3pk tu baby tops', 'images/89-3pk-tu-baby-tops.png'),
    (92::bigint, 'Pink bunny overall', 'images/92-pink-bunny-overall.png'),
    (96::bigint, 'Graco car seat', 'images/96-graco-car-seat.png'),
    (101::bigint, 'White floral dress', 'images/101-white-floral-dress.png'),
    (105::bigint, 'Tb gold/white dress', 'images/105-tb-gold-white-dress.png'),
    (114::bigint, 'Mother care top n bottom tiger set', 'images/114-mother-care-top-n-bottom-tiger-set.png'),
    (119::bigint, 'Sonic top & shorts jersey set', 'images/119-sonic-top-shorts-jersey-set.png'),
    (132::bigint, 'Boys 4 set shirt and trousers', 'images/132-boys-4-set-shirt-and-trousers.png'),
    (133::bigint, 'Girls red lace dress', 'images/133-girls-red-lace-dress.png'),
    (134::bigint, 'Boys shirt', 'images/134-boys-shirt.png'),
    (135::bigint, 'Girls black school shoe', 'images/135-girls-black-school-shoe.png'),
    (142::bigint, '3 set Navy blue suits', 'images/142-3-set-navy-blue-suits.png'),
    (144::bigint, 'Army green unisex jogger', 'images/144-army-green-unisex-jogger.png'),
    (146::bigint, 'Chicco next to me baby scout', 'images/146-chicco-next-to-me-baby-scout.png'),
    (154::bigint, 'Jeans skirt', 'images/154-jeans-skirt.png'),
    (164::bigint, 'Dream big back pack set', 'images/164-dream-big-back-pack-set.png'),
    (167::bigint, 'Blue black jeans skirt', 'images/167-blue-black-jeans-skirt.png'),
    (169::bigint, 'Game pad bottle', 'images/169-game-pad-bottle.png'),
    (170::bigint, 'Green n blue water bottle', 'images/170-green-n-blue-water-bottle.png'),
    (172::bigint, 'Blue water bottle', 'images/172-blue-water-bottle.png'),
    (173::bigint, 'Football water bottle', 'images/173-football-water-bottle.png'),
    (174::bigint, 'Red checkered dress', 'images/174-red-checkered-dress.png'),
    (177::bigint, 'Smiggle unicorn blue bag', 'images/177-smiggle-unicorn-blue-bag.png'),
    (179::bigint, 'Blue jeans shorts', 'images/179-blue-jeans-shorts.png'),
    (182::bigint, 'Aveeno daily care hair and bath', 'images/182-aveeno-daily-care-hair-and-bath.png'),
    (183::bigint, 'Boys blue bucket hat vest &shorts set', 'images/183-boys-blue-bucket-hat-vest-shorts-set.png'),
    (184::bigint, 'Boys trainer', 'images/184-boys-trainer.png'),
    (187::bigint, 'Smiggle blue back pack', 'images/187-smiggle-blue-back-pack.png')
  ) AS v(id, product_name, image_path) ON p.id = v.id AND p.name = v.product_name) <> expected_rows THEN
    RAISE EXCEPTION 'Verified product IDs/names changed; review the image mapping before applying';
  END IF;

  UPDATE public.products AS p
  SET image = v.image_path
  FROM (VALUES
    (4::bigint, 'Seba Med Cleansing Bar', 'images/4-seba-med-cleansing-bar.png'),
    (6::bigint, 'Tommee Tippee Bottle and Warmer', 'images/6-tommee-tippee-bottle-and-warmer.png'),
    (7::bigint, 'Little Angels Detergent Spray', 'images/7-little-angels-detergent-spray.png'),
    (8::bigint, 'Mermaid Tutu Dress', 'images/8-mermaid-tutu-dress.png'),
    (13::bigint, 'Top and Shorts Set', 'images/13-top-and-shorts-set.png'),
    (15::bigint, 'Pink Baby Layette Bodysuit', 'images/15-pink-baby-layette-bodysuit.png'),
    (20::bigint, 'Dressy Pink Bodysuit', 'images/20-dressy-pink-bodysuit.png'),
    (32::bigint, 'F&F Shorts and Top Set', 'images/32-f-f-shorts-and-top-set.png'),
    (35::bigint, 'Mothercare 5pk White Bodysuit', 'images/35-mothercare-5pk-white-bodysuit.png'),
    (39::bigint, 'Banana Republic Brown Long Sleeve Romper', 'images/39-banana-republic-brown-long-sleeve-romper.png'),
    (40::bigint, 'Polo Shirt', 'images/40-polo-shirt.png'),
    (41::bigint, '3pk TU Baby Tops', 'images/41-3pk-tu-baby-tops.png'),
    (44::bigint, 'Pink Bunny Overall', 'images/44-pink-bunny-overall.png'),
    (50::bigint, 'Seba med cleansing bar', 'images/50-seba-med-cleansing-bar.png'),
    (52::bigint, 'Tommee tipped bottle and warmer', 'images/52-tommee-tipped-bottle-and-warmer.png'),
    (53::bigint, 'Little angel baby shampoo', 'images/53-little-angel-baby-shampoo.png'),
    (54::bigint, 'Tommee tippee Anticolic bottle', 'images/54-tommee-tippee-anticolic-bottle.png'),
    (55::bigint, 'Little angels detergent spray', 'images/55-little-angels-detergent-spray.png'),
    (56::bigint, 'Mermaid tutu dress', 'images/56-mermaid-tutu-dress.png'),
    (61::bigint, 'Top n shorts set', 'images/61-top-n-shorts-set.png'),
    (63::bigint, 'Pink baby layette body suit', 'images/63-pink-baby-layette-body-suit.png'),
    (68::bigint, 'Dressy pink body suit', 'images/68-dressy-pink-body-suit.png'),
    (74::bigint, 'Christmas boys green and red shirt n trousers', 'images/74-christmas-boys-green-and-red-shirt-n-trousers.png'),
    (80::bigint, 'F&f shorts and top set', 'images/80-f-f-shorts-and-top-set.png'),
    (83::bigint, 'Mother care 5pk white body suit', 'images/83-mother-care-5pk-white-body-suit.png'),
    (87::bigint, 'Banana Republic brown long sleeve romper', 'images/87-banana-republic-brown-long-sleeve-romper.png'),
    (88::bigint, 'Polo shirt', 'images/88-polo-shirt.png'),
    (89::bigint, '3pk tu baby tops', 'images/89-3pk-tu-baby-tops.png'),
    (92::bigint, 'Pink bunny overall', 'images/92-pink-bunny-overall.png'),
    (96::bigint, 'Graco car seat', 'images/96-graco-car-seat.png'),
    (101::bigint, 'White floral dress', 'images/101-white-floral-dress.png'),
    (105::bigint, 'Tb gold/white dress', 'images/105-tb-gold-white-dress.png'),
    (114::bigint, 'Mother care top n bottom tiger set', 'images/114-mother-care-top-n-bottom-tiger-set.png'),
    (119::bigint, 'Sonic top & shorts jersey set', 'images/119-sonic-top-shorts-jersey-set.png'),
    (132::bigint, 'Boys 4 set shirt and trousers', 'images/132-boys-4-set-shirt-and-trousers.png'),
    (133::bigint, 'Girls red lace dress', 'images/133-girls-red-lace-dress.png'),
    (134::bigint, 'Boys shirt', 'images/134-boys-shirt.png'),
    (135::bigint, 'Girls black school shoe', 'images/135-girls-black-school-shoe.png'),
    (142::bigint, '3 set Navy blue suits', 'images/142-3-set-navy-blue-suits.png'),
    (144::bigint, 'Army green unisex jogger', 'images/144-army-green-unisex-jogger.png'),
    (146::bigint, 'Chicco next to me baby scout', 'images/146-chicco-next-to-me-baby-scout.png'),
    (154::bigint, 'Jeans skirt', 'images/154-jeans-skirt.png'),
    (164::bigint, 'Dream big back pack set', 'images/164-dream-big-back-pack-set.png'),
    (167::bigint, 'Blue black jeans skirt', 'images/167-blue-black-jeans-skirt.png'),
    (169::bigint, 'Game pad bottle', 'images/169-game-pad-bottle.png'),
    (170::bigint, 'Green n blue water bottle', 'images/170-green-n-blue-water-bottle.png'),
    (172::bigint, 'Blue water bottle', 'images/172-blue-water-bottle.png'),
    (173::bigint, 'Football water bottle', 'images/173-football-water-bottle.png'),
    (174::bigint, 'Red checkered dress', 'images/174-red-checkered-dress.png'),
    (177::bigint, 'Smiggle unicorn blue bag', 'images/177-smiggle-unicorn-blue-bag.png'),
    (179::bigint, 'Blue jeans shorts', 'images/179-blue-jeans-shorts.png'),
    (182::bigint, 'Aveeno daily care hair and bath', 'images/182-aveeno-daily-care-hair-and-bath.png'),
    (183::bigint, 'Boys blue bucket hat vest &shorts set', 'images/183-boys-blue-bucket-hat-vest-shorts-set.png'),
    (184::bigint, 'Boys trainer', 'images/184-boys-trainer.png'),
    (187::bigint, 'Smiggle blue back pack', 'images/187-smiggle-blue-back-pack.png')
  ) AS v(id, product_name, image_path)
  WHERE p.id = v.id
    AND p.name = v.product_name
    AND p.image IS DISTINCT FROM v.image_path;

  -- These seven previous references point to visually mismatched candidate photos.
  -- Clear only stale local cleaned-folder paths; leave other administrator URLs alone.
  UPDATE public.products AS p
  SET image = NULL
  FROM (VALUES
    (16::bigint, 'Monsoon Blue Floral Dress'),
    (23::bigint, 'Blue Red 3pk Sleepsuit'),
    (25::bigint, '3pk Tops'),
    (64::bigint, 'Monsoon blue floral dress'),
    (71::bigint, 'Blue red. 3pk sleep suit'),
    (73::bigint, '3pk tops'),
    (107::bigint, 'Monsoon blue floral dress')
  ) AS v(id, product_name)
  WHERE p.id = v.id
    AND p.name = v.product_name
    AND lower(coalesce(p.image, '')) LIKE ANY (ARRAY['images/catalog-cleaned/%', 'catalog-cleaned/%']);

  SELECT count(*) INTO unresolved_rows
  FROM public.products p JOIN (VALUES
    (4::bigint, 'Seba Med Cleansing Bar', 'images/4-seba-med-cleansing-bar.png'),
    (6::bigint, 'Tommee Tippee Bottle and Warmer', 'images/6-tommee-tippee-bottle-and-warmer.png'),
    (7::bigint, 'Little Angels Detergent Spray', 'images/7-little-angels-detergent-spray.png'),
    (8::bigint, 'Mermaid Tutu Dress', 'images/8-mermaid-tutu-dress.png'),
    (13::bigint, 'Top and Shorts Set', 'images/13-top-and-shorts-set.png'),
    (15::bigint, 'Pink Baby Layette Bodysuit', 'images/15-pink-baby-layette-bodysuit.png'),
    (20::bigint, 'Dressy Pink Bodysuit', 'images/20-dressy-pink-bodysuit.png'),
    (32::bigint, 'F&F Shorts and Top Set', 'images/32-f-f-shorts-and-top-set.png'),
    (35::bigint, 'Mothercare 5pk White Bodysuit', 'images/35-mothercare-5pk-white-bodysuit.png'),
    (39::bigint, 'Banana Republic Brown Long Sleeve Romper', 'images/39-banana-republic-brown-long-sleeve-romper.png'),
    (40::bigint, 'Polo Shirt', 'images/40-polo-shirt.png'),
    (41::bigint, '3pk TU Baby Tops', 'images/41-3pk-tu-baby-tops.png'),
    (44::bigint, 'Pink Bunny Overall', 'images/44-pink-bunny-overall.png'),
    (50::bigint, 'Seba med cleansing bar', 'images/50-seba-med-cleansing-bar.png'),
    (52::bigint, 'Tommee tipped bottle and warmer', 'images/52-tommee-tipped-bottle-and-warmer.png'),
    (53::bigint, 'Little angel baby shampoo', 'images/53-little-angel-baby-shampoo.png'),
    (54::bigint, 'Tommee tippee Anticolic bottle', 'images/54-tommee-tippee-anticolic-bottle.png'),
    (55::bigint, 'Little angels detergent spray', 'images/55-little-angels-detergent-spray.png'),
    (56::bigint, 'Mermaid tutu dress', 'images/56-mermaid-tutu-dress.png'),
    (61::bigint, 'Top n shorts set', 'images/61-top-n-shorts-set.png'),
    (63::bigint, 'Pink baby layette body suit', 'images/63-pink-baby-layette-body-suit.png'),
    (68::bigint, 'Dressy pink body suit', 'images/68-dressy-pink-body-suit.png'),
    (74::bigint, 'Christmas boys green and red shirt n trousers', 'images/74-christmas-boys-green-and-red-shirt-n-trousers.png'),
    (80::bigint, 'F&f shorts and top set', 'images/80-f-f-shorts-and-top-set.png'),
    (83::bigint, 'Mother care 5pk white body suit', 'images/83-mother-care-5pk-white-body-suit.png'),
    (87::bigint, 'Banana Republic brown long sleeve romper', 'images/87-banana-republic-brown-long-sleeve-romper.png'),
    (88::bigint, 'Polo shirt', 'images/88-polo-shirt.png'),
    (89::bigint, '3pk tu baby tops', 'images/89-3pk-tu-baby-tops.png'),
    (92::bigint, 'Pink bunny overall', 'images/92-pink-bunny-overall.png'),
    (96::bigint, 'Graco car seat', 'images/96-graco-car-seat.png'),
    (101::bigint, 'White floral dress', 'images/101-white-floral-dress.png'),
    (105::bigint, 'Tb gold/white dress', 'images/105-tb-gold-white-dress.png'),
    (114::bigint, 'Mother care top n bottom tiger set', 'images/114-mother-care-top-n-bottom-tiger-set.png'),
    (119::bigint, 'Sonic top & shorts jersey set', 'images/119-sonic-top-shorts-jersey-set.png'),
    (132::bigint, 'Boys 4 set shirt and trousers', 'images/132-boys-4-set-shirt-and-trousers.png'),
    (133::bigint, 'Girls red lace dress', 'images/133-girls-red-lace-dress.png'),
    (134::bigint, 'Boys shirt', 'images/134-boys-shirt.png'),
    (135::bigint, 'Girls black school shoe', 'images/135-girls-black-school-shoe.png'),
    (142::bigint, '3 set Navy blue suits', 'images/142-3-set-navy-blue-suits.png'),
    (144::bigint, 'Army green unisex jogger', 'images/144-army-green-unisex-jogger.png'),
    (146::bigint, 'Chicco next to me baby scout', 'images/146-chicco-next-to-me-baby-scout.png'),
    (154::bigint, 'Jeans skirt', 'images/154-jeans-skirt.png'),
    (164::bigint, 'Dream big back pack set', 'images/164-dream-big-back-pack-set.png'),
    (167::bigint, 'Blue black jeans skirt', 'images/167-blue-black-jeans-skirt.png'),
    (169::bigint, 'Game pad bottle', 'images/169-game-pad-bottle.png'),
    (170::bigint, 'Green n blue water bottle', 'images/170-green-n-blue-water-bottle.png'),
    (172::bigint, 'Blue water bottle', 'images/172-blue-water-bottle.png'),
    (173::bigint, 'Football water bottle', 'images/173-football-water-bottle.png'),
    (174::bigint, 'Red checkered dress', 'images/174-red-checkered-dress.png'),
    (177::bigint, 'Smiggle unicorn blue bag', 'images/177-smiggle-unicorn-blue-bag.png'),
    (179::bigint, 'Blue jeans shorts', 'images/179-blue-jeans-shorts.png'),
    (182::bigint, 'Aveeno daily care hair and bath', 'images/182-aveeno-daily-care-hair-and-bath.png'),
    (183::bigint, 'Boys blue bucket hat vest &shorts set', 'images/183-boys-blue-bucket-hat-vest-shorts-set.png'),
    (184::bigint, 'Boys trainer', 'images/184-boys-trainer.png'),
    (187::bigint, 'Smiggle blue back pack', 'images/187-smiggle-blue-back-pack.png')
  ) AS v(id, product_name, image_path) ON p.id = v.id AND p.name = v.product_name
  WHERE p.image IS DISTINCT FROM v.image_path;

  IF unresolved_rows <> 0 THEN
    RAISE EXCEPTION 'Image path verification failed for % rows', unresolved_rows;
  END IF;
END;
$migration$;
