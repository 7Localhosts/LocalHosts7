-- Set only the image paths for 18 visually verified products.
-- Image contents, names, stock, categories, and prices remain unchanged.
DO $migration$
DECLARE
  expected_rows integer := 18;
  matching_rows integer;
BEGIN
  SELECT count(*) INTO matching_rows
  FROM public.products AS p
  JOIN (VALUES
    (12::bigint, 'Yellow Green Top and Leggings', 'images/12-yellow-green-top-and-leggings.png'),
    (60::bigint, 'Yellow green top n leggings', 'images/60-yellow-green-top-n-leggings.png'),
    (71::bigint, 'Blue red. 3pk sleep suit', 'images/71-blue-red-3pk-sleep-suit.png'),
    (125::bigint, 'Hover board', 'images/125-hover-board.png'),
    (127::bigint, 'Rainbow ballerina dress', 'images/127-rainbow-ballerina-dress.png'),
    (138::bigint, 'White dress', 'images/138-white-dress.png'),
    (147::bigint, 'Robot dog', 'images/147-robot-dog.png'),
    (148::bigint, 'Boys black suit 3set', 'images/148-boys-black-suit-3set.png'),
    (149::bigint, 'Kids harmonica', 'images/149-kids-harmonica.png'),
    (150::bigint, 'Long sleeve white shirt', 'images/150-long-sleeve-white-shirt.png'),
    (151::bigint, 'Long sleeve blue shirt', 'images/151-long-sleeve-blue-shirt.png'),
    (152::bigint, 'Scooter', 'images/152-scooter.png'),
    (153::bigint, 'Tutu skirt', 'images/153-tutu-skirt.png'),
    (175::bigint, 'Smiggle Trolley bag pink', 'images/175-smiggle-trolley-bag-pink.png'),
    (176::bigint, 'Smiggle purple budz light up trolley bag', 'images/176-smiggle-purple-budz-light-up-trolley-bag.png'),
    (178::bigint, '2pk pink shorts', 'images/178-2pk-pink-shorts.png'),
    (190::bigint, 'White socks set', 'images/190-white-socks-set.png'),
    (191::bigint, 'Boys blue shark Croce', 'images/191-boys-blue-shark-croce.png')
  ) AS v(id, product_name, image_path)
    ON p.id = v.id AND p.name = v.product_name;

  IF matching_rows <> expected_rows THEN
    RAISE EXCEPTION 'Expected % visually verified products, found %; no image paths were updated.', expected_rows, matching_rows;
  END IF;

  UPDATE public.products AS p
  SET image = v.image_path
  FROM (VALUES
    (12::bigint, 'Yellow Green Top and Leggings', 'images/12-yellow-green-top-and-leggings.png'),
    (60::bigint, 'Yellow green top n leggings', 'images/60-yellow-green-top-n-leggings.png'),
    (71::bigint, 'Blue red. 3pk sleep suit', 'images/71-blue-red-3pk-sleep-suit.png'),
    (125::bigint, 'Hover board', 'images/125-hover-board.png'),
    (127::bigint, 'Rainbow ballerina dress', 'images/127-rainbow-ballerina-dress.png'),
    (138::bigint, 'White dress', 'images/138-white-dress.png'),
    (147::bigint, 'Robot dog', 'images/147-robot-dog.png'),
    (148::bigint, 'Boys black suit 3set', 'images/148-boys-black-suit-3set.png'),
    (149::bigint, 'Kids harmonica', 'images/149-kids-harmonica.png'),
    (150::bigint, 'Long sleeve white shirt', 'images/150-long-sleeve-white-shirt.png'),
    (151::bigint, 'Long sleeve blue shirt', 'images/151-long-sleeve-blue-shirt.png'),
    (152::bigint, 'Scooter', 'images/152-scooter.png'),
    (153::bigint, 'Tutu skirt', 'images/153-tutu-skirt.png'),
    (175::bigint, 'Smiggle Trolley bag pink', 'images/175-smiggle-trolley-bag-pink.png'),
    (176::bigint, 'Smiggle purple budz light up trolley bag', 'images/176-smiggle-purple-budz-light-up-trolley-bag.png'),
    (178::bigint, '2pk pink shorts', 'images/178-2pk-pink-shorts.png'),
    (190::bigint, 'White socks set', 'images/190-white-socks-set.png'),
    (191::bigint, 'Boys blue shark Croce', 'images/191-boys-blue-shark-croce.png')
  ) AS v(id, product_name, image_path)
  WHERE p.id = v.id
    AND p.name = v.product_name
    AND p.image IS DISTINCT FROM v.image_path;
END
$migration$;
