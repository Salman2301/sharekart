/** 
 * @typedef {object} order
 * @property {string} _id
 * @property {string} _updatedDate
 * @property {string} buyerLanguage
 * @property {string} cartId
 * @property {object} channelInfo
 * @property {string} channelInfo.type
 * @property {object} enteredBy
 * @property {string} enteredBy.id
 * @property {string} enteredBy.identityType
 * @property {any} refunds
 * @property {object} billingInfo
 * @property {object} billingInfo.address
 * @property {string} billingInfo.address.formatted
 * @property {string} billingInfo.address.city
 * @property {string} billingInfo.address.country
 * @property {string} billingInfo.address.addressLine
 * @property {string} billingInfo.address.postalCode
 * @property {string} billingInfo.address.subdivision
 * @property {string} billingInfo.firstName
 * @property {string} billingInfo.lastName
 * @property {string} billingInfo.email
 * @property {string} billingInfo.phone
 * @property {object} buyerInfo
 * @property {string} buyerInfo.id
 * @property {string} buyerInfo.type
 * @property {string} buyerInfo.identityType
 * @property {string} buyerInfo.firstName
 * @property {string} buyerInfo.lastName
 * @property {string} buyerInfo.phone
 * @property {string} buyerInfo.email
 * @property {string} _dateCreated
 * @property {string} currency
 * @property {string} fulfillmentStatus
 * @property {boolean} archived
 * @property {any} activities
 * @property {number} number
 * @property {string} paymentStatus
 * @property {object} shippingInfo
 * @property {string} shippingInfo.deliveryOption
 * @property {string} shippingInfo.shippingRegion
 * @property {object} shippingInfo.shipmentDetails
 * @property {object} shippingInfo.shipmentDetails.address
 * @property {string} shippingInfo.shipmentDetails.address.formatted
 * @property {string} shippingInfo.shipmentDetails.address.city
 * @property {string} shippingInfo.shipmentDetails.address.country
 * @property {string} shippingInfo.shipmentDetails.address.addressLine
 * @property {string} shippingInfo.shipmentDetails.address.postalCode
 * @property {string} shippingInfo.shipmentDetails.address.subdivision
 * @property {string} shippingInfo.shipmentDetails.firstName
 * @property {string} shippingInfo.shipmentDetails.lastName
 * @property {string} shippingInfo.shipmentDetails.email
 * @property {string} shippingInfo.shipmentDetails.phone
 * @property {number} shippingInfo.shipmentDetails.tax
 * @property {number} shippingInfo.shipmentDetails.discount
 * @property {object} shippingInfo.shipmentDetails.priceData
 * @property {number} shippingInfo.shipmentDetails.priceData.price
 * @property {boolean} shippingInfo.shipmentDetails.priceData.taxIncludedInPrice
 * @property {null} shippingInfo.pickupDetails
 * @property {string} shippingInfo.code
 * @property {object[]} lineItems
 * @property {number} lineItems.index
 * @property {number} lineItems.quantity
 * @property {number} lineItems.price
 * @property {string} lineItems.name
 * @property {string} lineItems.translatedName
 * @property {string} lineItems.productId
 * @property {number} lineItems.totalPrice
 * @property {string} lineItems.lineItemType
 * @property {object[]} lineItems.options
 * @property {string} lineItems.options.option
 * @property {string} lineItems.options.selection
 * @property {any} lineItems.customTextFields
 * @property {object} lineItems.mediaItem
 * @property {string} lineItems.mediaItem.id
 * @property {string} lineItems.mediaItem.src
 * @property {string} lineItems.mediaItem.type
 * @property {string} lineItems.sku
 * @property {string} lineItems.variantId
 * @property {number} lineItems.discount
 * @property {number} lineItems.tax
 * @property {boolean} lineItems.taxIncludedInPrice
 * @property {object} lineItems.priceData
 * @property {number} lineItems.priceData.price
 * @property {number} lineItems.priceData.totalPrice
 * @property {boolean} lineItems.priceData.taxIncludedInPrice
 * @property {number} lineItems.weight
 * @property {object} totals
 * @property {number} totals.discount
 * @property {number} totals.quantity
 * @property {number} totals.shipping
 * @property {number} totals.subtotal
 * @property {number} totals.tax
 * @property {number} totals.total
 * @property {number} totals.weight
 * @property {string} weightUnit
 * @property {any} fulfillments
 * @property {object} discount
 * @property {object} discount.appliedCoupon
 * @property {string} discount.appliedCoupon.couponId
 * @property {string} discount.appliedCoupon.name
 * @property {string} discount.appliedCoupon.code
 */

export const Types = {}
