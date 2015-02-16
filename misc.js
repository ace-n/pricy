var Misc = {
	// Convert floats to 2-digit decimals and remove trailing zeroes
	centify: function (f) {
		f = f.toFixed(2).toString();
		for (var i = f.length - 1; f[i] === "0"; i--) {}
		return f.slice(0, f[i] === "." ? i : i+1);
	},

	// Replace a needle at the front of a string with another string
	replaceStart: function(h, n, r) { 
		if (!Misc.startsWith(h,n)) {
			return h;
		} else {
			return r + h.slice(n.length);
		}
	},

	// Standard startsWith function
	startsWith: function(h, n) {
		var nl = n.length;
		return nl <= h.length && h.slice(0, nl) === n;
	},

	// Convert a string to its DOM representation (without the wrapping HTML)
	parseHTML: function(str) {
		var wrapped = (new DOMParser()).parseFromString(str, "text/html");
		return wrapped.childNodes[0].childNodes[1].childNodes[0];
	}
}
