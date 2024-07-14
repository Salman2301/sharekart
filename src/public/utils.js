
/**
 * Round a number and seconda parameter can be use to pass the decimal
 */
export function round(num, dec = 0) {
	return Math.round(num*Math.pow(10, dec)) / Math.pow(10, dec);
}

export function slugify(str) {
	return str.replace(/[\s+-,.'!@#$%^&*]/g, "-").toLowerCase()
}

export function formatNum(num) {
	return new Intl.NumberFormat("en", {
		notation: "compact",
		compactDisplay: "short",
		maximumFractionDigits: 1
	}).format(num);
}
