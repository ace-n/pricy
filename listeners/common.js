// HTML helpers
var tab = "&nbsp;&nbsp;";
var tabWrap = function(c) {
	return tab + c + tab;
}
var htmlError = function(favicon, ex) {
	return "<p class='pricy-inject pricy-error'>" +
				favicon + tab + ex +
			"</p>";
}
var htmlSpan = function(_class, content) {
	return "<span class='" + _class + "'>" + content + "</span>";
}
var fa = function(iconName) {
	return htmlSpan("fa fa-" + iconName,"");
}
var htmlLoHi = function(lo, hi, startIcon, faIcon, currencyIcon) {
	var loHi = lo + (lo === hi ? "" : " - " + hi);
	return startIcon + tab + fa(faIcon) + htmlSpan("pricy-price", "&nbsp;" + loHi + "&nbsp;" + currencyIcon);
}
var htmlNormalFailures = function(customNamed, json, favicon) {
	var errorMsg = "No match found.";
	if (customNamed)
		errorMsg = "Custom names not yet supported.";
	else if (json && json["l"] == "?")
		errorMsg = "Price is uncertain.";
	return htmlError(favicon, errorMsg);
}

// TF2WH main function
var commonAddItemTF2WH = function(optionsStore, json, favicon, customNamed) {

	// Add details to item
	var asi; // "Automatic semicolon insertion" = return statements must be one liners
	var buyPrice, sellPrice, toggle, buyBlocked, sellBlocked;
	if (json) {
		try {

			// Compute prices
			toggle = Options.PRICE_CURRENCY_MODE(optionsStore) == 1 ? "c" : "p";
			buyPrice = json["b" + toggle];
			sellPrice = json["s" + toggle + (Options.PRICES_SHOW_ULTIMATE(optionsStore) ? "-u" : "")];

			// Take stock into account (if necessary)
			buyBlocked = sellBlocked = "pricy-price"; // Default "price" style
			if (Options.PRICES_SHOW_NA_IF_IMPOSSIBLE(optionsStore)) {
				var curStock = json["h"];
				if (parseInt(json["m"]) <= curStock) {
					sellPrice = "N/A";
					sellBlocked = "pricy-stockblocked";
				}
				if (curStock < 1) {
					buyPrice = "N/A";
					buyBlocked = "pricy-stockblocked";
				}
			}

			// Format stock
			var stock = null;
			switch (Options.PRICES_STOCK_DISPLAY_MODE(optionsStore)) {
				case 2:
					break;
				case 1:
					stock = parseInt(100*parseFloat(json["h"],10)/parseFloat(json["m"],10), 10) + "%";
					break;
				case 0:
					stock = json["h"] + "/" + json["m"];
					break;
			}
			if (stock)
				stock = fa("inbox") + htmlSpan("pricy-price", "&nbsp;" + stock + tab);

			// Add details to HTML
			asi = 
				"<p class='pricy-inject'>" +
					favicon +
						tabWrap(fa("square-o")) + stock +
						fa("shopping-cart") + htmlSpan(buyBlocked, "&nbsp;" + buyPrice) +
						tabWrap(fa("dollar") + htmlSpan(sellBlocked, "&nbsp;" + sellPrice)) +
				"</p>";
			return asi;
		}
		catch (ex) {
			return htmlError(favicon, "Error: " + ex);
		}
	} else if (Options.ITEMS_SHOW_NORMAL_FAILURES(optionsStore)) {
		return htmlNormalFailures(customNamed, json, favicon); // Return error message
	} else {
		return "";
	}

};

// Backpack.tf main function
var commonAddItemBPTF = function(itemsStore, optionsStore, json, favicon, customNamed) {

	var asi; // "Automatic semicolon insertion" = return statements must be one liners
	var showParts, i, f, pJson, loCur, hiCur, keyRefRatio, unitRatio, lo, hi; // Other loop vars
	keyRefRatio = null;
	if (json && json["l"] !== "?") {
		try {

			// Init variables
			lo = json["l"]; hi = json["h"];

			// Convert lo/hi prices to appropriate units
			var f;
			if (Options.PRICE_CURRENCY_MODE(optionsStore) === 0) {
				try {
					unitRatio = PricyQuery.queryTF2WH(itemsStore, json["u"], true)["bp"];
				} catch (ex) {
					return htmlError(favicon, "TF2WH error: " + ex);
				}
				f = function(a) { return (a*unitRatio).toFixed(); }
			} else {
				f = Misc.centify;
			}
			lo = f(lo);
			hi = f(hi);

			// Add details to HTML
			faIcon = (Options.PRICE_CURRENCY_MODE(optionsStore) === 0 ? "" : fa(json["uh"]));
			asi = 
				"<p class='pricy-inject'>" +
					htmlLoHi(lo, hi, favicon, "square-o", faIcon)
				"</p>";

			// Done!
			return asi;
		}
		catch (ex) {
			console.log(ex);
			return htmlError(favicon, "Error: " + ex);
		}
	} else if (Options.ITEMS_SHOW_NORMAL_FAILURES(optionsStore)) {
		return htmlNormalFailures(customNamed, json, favicon);
	} else {
		return "";
	}
};

// Trade.tf main function
var commonAddItemTradeTF = function(itemsStore, optionsStore, json, favicon, customNamed, parts) {

	var asi; // "Automatic semicolon insertion" = return statements must be one liners
	var showParts, i, pJson, loAlone, hiAlone, loParts, hiParts, loCur, hiCur, keyRefRatio, unitRatio; // Other loop vars
	keyRefRatio = null;
	if (json && json["l"] !== "?") {
		try {

			// Init variables
			loAlone = loParts = json["l"]; hiAlone = hiParts = json["h"];

			// Calculate lo/hi with parts prices (if applicable)
			showParts = false;
			if (Options.PRICES_PARTS_DISPLAY_MODE(optionsStore) !== 0 && parts.length > 0) {

				// Common variables
				keyRefRatio = PricyQuery.queryTradeTF(itemsStore, "Mann Co. Supply Crate Key", true, false);
				keyRefRatio = (keyRefRatio["l"] + keyRefRatio["h"])/2;

				// Sum parts
				for (i=0; i<parts.length; i++) {
					pJson = PricyQuery.queryTradeTF(itemsStore, parts[i], true, true);
					if (pJson) {

						// Vars
						showParts = true;
						loCur = pJson["l"]; hiCur = pJson["h"];

						// Make sure part and original item are in terms of the same thing
						if (json["uh"] != pJson["uh"]) {

							// Assuming parts are traded in terms of keys and ref exclusively
							// (since not doing so increases complexity significantly)
							if (pJson["uh"] === "key") { loCur *= keyRefRatio; hiCur *= keyRefRatio; }
							else { loCur /= keyRefRatio; hiCur /= keyRefRatio; }
						}

						// Accumulate
						loParts += loCur; hiParts += hiCur;
					}
				}
			}

			// Convert lo/hi prices to appropriate units
			var f;
			if (Options.PRICE_CURRENCY_MODE(optionsStore) === 0) {
				try {
					unitRatio = PricyQuery.queryTF2WH(itemsStore, json["u"], true)["bp"];
				} catch (ex) {
					return htmlError(favicon, "TF2WH error: " + ex);
				}
				f = function(a) { return (a * unitRatio).toFixed(); }
			} else {
				f = Misc.centify;
			}
			loAlone = f(loAlone); loParts = f(loParts); hiAlone = f(hiAlone); hiParts = f(hiParts);

			// Add details to HTML
			faIcon = (Options.PRICE_CURRENCY_MODE(optionsStore) === 0 ? "" : fa(json["uh"]));
			asi = "<p class='pricy-inject'>" +
					htmlLoHi(loAlone, hiAlone, favicon, "square-o", faIcon);
			if (showParts)
				asi += htmlLoHi(loParts, hiParts, "", "plus-square-o", faIcon);
			asi += "</p>"

			// Done!
			return asi;
		}
		catch (ex) {
			console.log(ex);
			return htmlError(favicon, "Error: " + ex);
		}
	} else if (Options.ITEMS_SHOW_NORMAL_FAILURES(optionsStore)) {
		return htmlNormalFailures(customNamed, json, favicon);
	} else {
		return "";
	}
};
