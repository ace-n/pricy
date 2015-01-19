var Misc = {
	// Convert floats to 2-digit decimals and remove trailing zeroes
	centify: function (f) {
		f = f.toFixed(2);
		for (var i = f.length - 1; f[i] === "0"; i--) {}
		return f[i] === "." ? f.slice(0, i) : f;
	},

	// Replace a needle at the front of a string with another string
	replaceStart: function(h, n, r) {
		var nl = n.length;
		if (nl > h.length || h.slice(0, nl) !== n) {
			return h;
		} else {
			return r + h.slice(nl);
		}
	}
}
