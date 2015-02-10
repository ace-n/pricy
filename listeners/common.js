var commonAddItemTF2WH = function(optionsStore, json, favicon, customNamed) {

	// Add details to item
	var asi; // "Automatic semicolon insertion" = return statements must be one liners
	var buyPrice, sellPrice, toggle; // Other loop vars
	if (json) {
		try {

			// Compute prices
			toggle = Options.PRICE_CURRENCY_MODE(optionsStore) == 1 ? "c" : "p";
			buyPrice = json["b" + toggle];
			sellPrice = json["s" + toggle + (Options.PRICES_SHOW_ULTIMATE(optionsStore) ? "-u" : "")];

			// Take stock into account (if necessary)
			var buyBlocked = "";
			var sellBlocked = "";
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
			var stock = "";
			switch (Options.PRICES_STOCK_DISPLAY_MODE(optionsStore)) {
				case 2:
					break; // Every other case should fall through to the default
				case 1:
					stock = parseInt(100*parseFloat(json["h"],10)/parseFloat(json["m"],10), 10) + "%";
					break;
				case 0:
					stock = json["h"] + "/" + json["m"];
					break;
			}
			if (Options.PRICES_STOCK_DISPLAY_MODE(optionsStore) !== 2)
				stock = "<span class='fa fa-inbox'></span>: " + stock + "&nbsp;&nbsp;";

			// Add details to HTML
			asi = 
				"<p class='pricy-inject'>" +
					favicon +
					"&nbsp;&nbsp;<span class='fa fa-square-o'></span>&nbsp;&nbsp;" +
					stock + 
					"<span class='" + buyBlocked + "'>" +
						"<span class='fa fa-shopping-cart'></span>: " + buyPrice +
					"</span>" +
					"&nbsp;&nbsp;" +
					"<span class='" + sellBlocked + "'>" +
						"<span class='fa fa-dollar'></span>: " + sellPrice +
					"</span>" +
				"</p>";
			return asi;
		}
		catch (ex) {
			return "<p class='pricy-inject pricy-error'>Error: " + ex + "</p>";
		}
	} else if (Options.ITEMS_SHOW_NORMAL_FAILURES(optionsStore)) {
		console.log(Options.ITEMS_SHOW_NORMAL_FAILURES(optionsStore));
		asi = 
			"<p class='pricy-inject pricy-error'>" +
				favicon + "&nbsp;&nbsp;" +
				(customNamed ? "Custom names not yet supported" : "No match found.") +
			"</p>";
		return asi;
	} else {
		return "";
	}

};

var commonAddItemTradeTF = function(itemsStore, optionsStore, json, favicon, customNamed, parts) {

	var asi; // "Automatic semicolon insertion" = return statements must be one liners
	var showParts, i, pJson, loCur, hiCur, keyRefRatio, unitRatio; // Other loop vars
	keyRefRatio = null;
	if (json && json["l"] !== "?") {
		try {

			// Init variables
			var loAlone = json["l"];
			var hiAlone = json["h"];
			var loParts = loAlone;
			var hiParts = hiAlone;

			// Calculate lo/hi with parts prices (if applicable)
			showParts = false;
			if (Options.PRICES_PARTS_DISPLAY_MODE(optionsStore) !== 0 && parts.length > 0) {
				for (i=0; i<parts.length; i++) {
					pJson = PricyQuery.queryTradeTF(itemsStore, parts[i], true, true);
					if (pJson) {
						//pJson = JSON.parse(pJson);
						loCur = pJson["l"];
						hiCur = pJson["h"];

						// Make sure part and original item are in terms of the same thing
						if (json["uh"] != pJson["uh"]) {

							// Common vars
							if (!keyRefRatio) {
								keyRefRatio = PricyQuery.queryTradeTF(itemsStore, "Mann Co. Supply Crate Key", true, false);
								keyRefRatio = (keyRefRatio["l"] + keyRefRatio["h"])/2;
							}

							// Assuming parts are traded in terms of keys and ref exclusively
							// (since not doing so increases complexity significantly)
							if (pJson["uh"] === "key") {
								loCur *= keyRefRatio;
								hiCur *= keyRefRatio;
							} else {
								loCur /= keyRefRatio;
								hiCur /= keyRefRatio;
							}
						}

						// Accumulate
						showParts = true;
						loParts += loCur;
						hiParts += hiCur;
					}
				}
			}

			// Convert lo/hi prices to appropriate units
			if (Options.PRICE_CURRENCY_MODE(optionsStore) === 0) {
				try {
					unitRatio = PricyQuery.queryTF2WH(itemsStore, json["u"], true)["bp"];
				} catch (ex) {
					return "<p class='pricy-inject pricy-error'>" + favicon + " TF2WH error: " + ex + "</p>";
				}
				loAlone = (loAlone * unitRatio).toFixed();
				loParts = (loParts * unitRatio).toFixed();
				hiAlone = (hiAlone * unitRatio).toFixed();
				hiParts = (hiParts * unitRatio).toFixed();
			} else {
				loParts = Misc.centify(loParts);
				hiParts = Misc.centify(hiParts);
			}

			// Add details to HTML
			faIcon = (Options.PRICE_CURRENCY_MODE(optionsStore) === 0 ? "" : " <span class='fa fa-" + json["uh"] + "'/>");
			asi = 
				"<p class='pricy-inject'>" +
					favicon +
					"&nbsp;&nbsp;<span class='fa fa-square-o'></span>&nbsp;&nbsp;" +
					loAlone + (loAlone == hiAlone ? "" : " - " + hiAlone) +
					faIcon;
			if (showParts) {
				asi += 
					"&nbsp;&nbsp;" +
						"<span class='fa fa-plus-square-o'></span>&nbsp;&nbsp;" +
						loParts + (loParts == hiParts ? "" : " - " + hiParts) + 
						faIcon;
			}
			asi += "</p>"

			// Done!
			return asi;
		}
		catch (ex) {
			console.log(ex);
			return "<p class='pricy-inject pricy-error'>Error: " + ex + "</p>";
		}
	} else if (Options.ITEMS_SHOW_NORMAL_FAILURES(optionsStore)) {

		// Return error message
		var errorMsg = "No match found";
		if (customNamed)
			errorMsg = "Custom names not yet supported";
		else if (json && json["l"] == "?")
			errorMsg = "Price is uncertain";
		return "<p class='pricy-inject pricy-error'>" + favicon  + "&nbsp;&nbsp;" + errorMsg + "</p>";
	} else {
		return "";
	}
};
