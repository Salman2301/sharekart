import * as OrderTypes from "../order";

/**
 * @typedef {object} user_post
 * @property {string} post
 * @property {string} fullname
 * @property {string} orderId
 * @property {OrderTypes.order["lineItems"]} lineItems
 * @property {number} total
 * @property {string[]} productIds
 * @property {OrderTypes.order} raw
 * @property {string} currency
 * @property {number} totalQty
 * @property {number} totalPrice
 * @property {string} _id
 * @property {string} _owner
 * @property {string} _createdDate
 * @property {number} likeCount
 */

export const Types = {}
