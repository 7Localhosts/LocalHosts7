/**
 * delivery.js — Delivery configuration for Kay's Haven
 *
 * Centralised here so the business can update zones, fees and
 * times without touching any route logic.  Import this wherever
 * delivery data is needed.
 */

const deliveryConfig = {
  /**
   * Delivery zones with their covered areas, flat fee (GHS) and
   * estimated fulfilment window.
   */
  zones: [
    {
      name: 'Accra Central',
      areas: [
        'Dzorwulu', 'Achimota', 'East Legon', 'Osu', 'Labone',
        'Airport Residential', 'Cantonments', 'Ridge', 'North Labone',
        'Tesano', 'Abelemkpe',
      ],
      fee: 15,
      estimatedDays: '1–2 business days',
    },
    {
      name: 'Greater Accra',
      areas: [
        'Tema', 'Madina', 'Adenta', 'Kasoa', 'Ashaiman', 'Teshie',
        'Nungua', 'Dansoman', 'Amasaman', 'Pokuase', 'Haatso',
        'Spintex', 'Sakumono',
      ],
      fee: 20,
      estimatedDays: '2–3 business days',
    },
    {
      name: 'Other Regions',
      areas: [
        'Kumasi', 'Takoradi', 'Cape Coast', 'Sunyani', 'Tamale',
        'Ho', 'Wa', 'Bolgatanga', 'Koforidua', 'and all other regions',
      ],
      fee: 40,
      estimatedDays: '3–5 business days',
    },
  ],

  /**
   * Pickup locations where customers can collect their orders for free.
   */
  pickupLocations: [
    {
      name: 'Dzorwulu Branch',
      address: 'Dzorwulu, Accra',
      hours: 'Monday – Saturday: 9 AM – 6 PM',
      phone: '+233 595 237 037',
      whatsapp: 'https://wa.me/233595237037',
    },
    {
      name: 'Achimota Branch',
      address: 'Achimota, Accra',
      hours: 'Monday – Saturday: 9 AM – 6 PM',
      phone: '+233 540 987 398',
      whatsapp: 'https://wa.me/233540987398',
    },
  ],

  /**
   * Set to a GHS amount to offer free delivery above that threshold,
   * or null to disable.
   */
  freeDeliveryThreshold: null,

  /**
   * General delivery notes shown to customers.
   */
  notes: [
    'Orders placed before 12 PM (noon) are processed the same day.',
    'Delivery operates Monday to Saturday.',
    'For Sunday or urgent same-day deliveries, contact us on WhatsApp.',
    'Pickup orders are ready within 2–4 hours of placement.',
    'Delivery fees are calculated at checkout based on your area.',
  ],
};

module.exports = deliveryConfig;
