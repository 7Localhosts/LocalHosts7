# Kay’s Haven Design System

This document is the visual source of truth for the storefront and staff interface. Keep page-specific styles within this palette and typography system.

## Brand palette

| Token | HEX | Use |
| --- | --- | --- |
| Primary purple | `#7A13AA` | Brand marks, primary actions, selected states, and focus indicators |
| Dark purple | `#560B79` | Purple hover and pressed states |
| Light lavender | `#F4EBFA` | Alternate product-card surface and quiet purple-tinted panels |
| Black | `#000000` | Footer background, selected emphasis, and high contrast text |
| White | `#FFFFFF` | Main page backgrounds and text on dark surfaces |
| Soft neutral | `#F5F5F5` | Quiet panels, disabled surfaces, and subtle status backgrounds |
| Border neutral | `#D5D5D5` | Input, card, and table borders |
| Main text | `#27282A` | Body copy on light surfaces |
| Muted text | `#666666` | Secondary copy on light surfaces |

The brand palette contains purple, black, white, and neutral shades. Do not introduce pink or other accent hues in interface styling. Product names may still describe the actual colour of merchandise.

## Typography

- **Playfair Display** is reserved for the “Haven” wordmark treatment and selected editorial headings.
- **Montserrat** is used for functional interface text, navigation, forms, buttons, tables, and product data.
- Use sensible serif and sans-serif fallbacks. Fonts load from Google Fonts with local generic fallbacks.
- Keep the exact slogan wording and capitalization: **Quality products from crib to campus.** On light backgrounds, “Quality products” is purple and “from crib to campus.” is black; both phrases are white in the black footer.

## Components and layout

- Use purple primary buttons with white text; use black or white only for deliberate high-contrast secondary treatments.
- Use rounded cards and controls consistently, with restrained shadows and neutral borders.
- Alternate storefront product-card surfaces between white and light lavender (`--kh-lavender`).
- Keep focus indicators visible and keyboard operable.
- The shared storefront footer is a single black section containing the brand, Instagram and Facebook logos, shop/help/contact links, and legal links. Keep content white with comfortable contrast.
- At mobile widths, collapse the main navigation behind the accessible three-line menu button. Keep menu state in `aria-expanded` and close the menu after navigation or Escape.
- Use responsive grids and avoid horizontal overflow at narrow widths.

## Photography and social destinations

- The same local mother-and-baby image is used on the storefront and staff login screen, without a visible credit overlay.
- The root `index.html` is a dedicated landing page with the brand, exact slogan, shared local hero image, and a prominent `Enter Shop` link to `shop.html`. Keep the storefront at `/shop.html`; cart, checkout, product and policy return links go directly to the shop.
- Use the approved local mother-and-baby image. Confirm its original source and usage rights before public release; do not imply that pictured people endorse Kay’s Haven.
- Instagram links to `https://www.instagram.com/kayshaven.mothercare/` and Facebook links to the existing business profile. Keep both links accessible and open external pages safely.

## Responsive behavior

- Desktop uses the full storefront navigation and the shared four-column footer.
- Tablet and mobile use the hamburger navigation and stack footer columns as needed.
- The storefront footer remains a single shared black section with business, legal and contact links plus the Instagram and Facebook SVG logos; keep its white content and high-contrast focus states.
- Preserve readable type, touch-sized controls, legible contrast, and the primary shopping actions at every width.
