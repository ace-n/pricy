/* Pricy data-interop for TF2Outpost.com */

// Helper function
var favify = function(url) {
	return "<img style='width: 25px; position:relative; top:7px; left:5px;' src='" + chrome.extension.getURL(url) + "' /> ";
}

// Favicon URLs
var wh_favicon = favify('/icons/wh.ico');
var tradetf_favicon = favify('/icons/tradetf.ico');

// TF2WH item adding helper function
var INTERNAL_addItemTF2WH = function (item, attrs) {
	
	// Get data
	var name = (attrs["data-real-name"] || attrs["data-name"]).value;
	var craftable = true;
	var flags = attrs["data-flags"];
	if (flags)
		craftable = (flags.value.indexOf("(Not Craftable)") === -1);

	// Query TF2WH (and throw an exception if query fails)
	var newJson = PricyQuery.queryTF2WH(itemsStore, name, craftable);
	
	// Add details to item
	var asi; // "Automatic semicolon insertion" = return statements must be one liners
	var buyPrice, sellPrice, toggle; // Other loop vars
	if (newJson) {
		try {

			// Compute prices
			toggle = (Options.PRICE_CURRENCY_MODE(optionsStore) == 1 ? "c" : "p") + (Options.PRICES_SHOW_ULTIMATE(optionsStore) ? "-u" : "");
			buyPrice = newJson["b" + toggle];
			sellPrice = newJson["s" + toggle];

			// Add details to HTML
			asi = 
				"<p style='color:white'>" +
					wh_favicon +
					"&nbsp;&nbsp;<span class='fa fa-square-o'/>&nbsp;&nbsp;" +
					"<span class='fa fa-inbox' />: " + newJson["h"] + "/" + newJson["m"] +
					"&nbsp;&nbsp;" +
					"<span class='fa fa-shopping-cart' />: " + buyPrice + 
					"&nbsp;&nbsp;" +
					"<span class='fa fa-dollar' />: " + sellPrice +
				"</p>";
			return asi;
		}
		catch (ex) {
			return "<p>Error: " + ex + "</p>";
		}
	} else if (Options.ITEMS_SHOW_NORMAL_FAILURES(optionsStore)) {
		asi = 
			"<p style='color:red'>" +
				wh_favicon + "&nbsp;&nbsp;" +
				(customNamed ? "Custom names not yet supported" : "No match found.") +
			"</p>";
		return asi;
	}
}

// Trade.tf item adding helper function
var INTERNAL_addItemTradeTF = function (item, attrs) {
	
	// Get data
	var name = (attrs["data-real-name"] || attrs["data-name"]).value;
	var craftable = true;
	var flags = attrs["data-flags"];
	if (flags)
		craftable = (flags.value.indexOf("(Not Craftable)") === -1);

	// Get more data + additional parts (strange addons/paints)
	var notes = attrs["data-attributes"];
	var parts = [];
	if (notes) {
		var noteLines = (notes.value.slice(5)).split(/<.+?>/g);
		var i, line, pName;
		var dp = new DOMParser();
		var isFirstLine = true;

		for (i=0; i<noteLines.length; i++) {

			// Get line
			line = noteLines[i];
			if (!line || line.length < 2)
				continue; // Skip null lines

			// Record line info
			// - Paints
			else if (Misc.startsWith(line, "Painted: "))
				parts.push(line.slice(9));
			// - Skip first line (if we're dealing with strange attributes),
			//   since it's not an additional part
			else if (isFirstLine) { isFirstLine = false; }
			// - Skip "Crafted/Gifted by" lines
			else if (Misc.startsWith(line, "Crafted by ") || Misc.startsWith(line, "Gifted on ")) {}
			// - Strange [Cosmetic] Parts
			else {
				pName = line.replace(new RegExp(/:.+$/), "");
				if (PricyQuery.queryTradeTF(itemsStore, "Strange Cosmetic Part: " + pName, true, false)) {
					pName = "Strange Cosmetic Part: " + pName;
				} else {
					pName = "Strange Part: " + pName;
				}
				parts.push(pName);
			}
			isFirstLine = false;
		}
	}

	// Query Trade.tf (and throw an exception if query fails)
	var json = PricyQuery.queryTradeTF(itemsStore, name, craftable, false);
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
					"<p style='color:red'>" + tradetf_favicon + "TF2WH error: " + ex + "</p>";
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
				"<p style='color:white'>" +
					tradetf_favicon +
					"&nbsp;&nbsp;<span class='fa fa-square-o'/>&nbsp;&nbsp;" +
					loAlone + (loAlone == hiAlone ? "" : " - " + hiAlone) +
					faIcon;
			if (showParts) {
				asi += 
					"&nbsp;&nbsp;" +
						"<span class='fa fa-plus-square-o'/>&nbsp;&nbsp;" +
						loParts + (loParts == hiParts ? "" : " - " + hiParts) + 
						faIcon;
			}
			asi += "</p>"

			// Done!
			return asi;
		}
		catch (ex) {
			console.log(ex);
			return "<p>Error: " + ex + "</p>";
		}
	} else if (Options.ITEMS_SHOW_NORMAL_FAILURES(optionsStore)) {

		// Return error message
		var errorMsg = "No match found";
		if (customNamed)
			errorMsg = "Custom names not yet supported";
		else if (json && json["l"] == "?")
			errorMsg = "Price is uncertain";
		return "<p style='color:red'>" + tradetf_favicon + errorMsg + "</p>";
	}
}

// Master item adding helper function
var INTERNAL_addItem = function (item) {

	// Get values
	attrs = item.attributes;
	if (!attrs)
		return null;

	// Skip actual non-TF2 items
	if (!attrs["data-hash"] || !Misc.startsWith(attrs["data-hash"].value, "440"))
		return null;

	// Add additional data
	ael = function(item, attrs, origDetails) {

		// Get data
		var newDetails = attrs['data-subtitle'].value;
		if (origDetails)
			newDetails = origDetails;
		else if (!newDetails)
			newDetails = "";

		// Query TF2WH
		var tryingLater = false;
		if (Options.PRICES_SHOW_TF2WH(optionsStore)) {
			try {
				newDetails += INTERNAL_addItemTF2WH(item, attrs);
			}
			catch (ex) {
				if (ex !== "Item not found.") {
					console.log(ex);
					tryingLater = true;
					setTimeout(function(newDetails) { ael(item, attrs, origDetails); }, 250);
					newDetails += "<p>" + wh_favicon + ex + "</p>";
				}
			}
		}

		// Query Trade.tf
		if (Options.PRICES_SHOW_TRADETF(optionsStore)) {
			try {
				newDetails += INTERNAL_addItemTradeTF(item, attrs)
			}
			catch (ex) {
				if (ex !== "Item not found.") {
					console.log(ex);
					if (!tryingLater) {
						setTimeout(function(newDetails) { ael(item, attrs, origDetails); }, 250);
					}
					tryingLater = true;
					newDetails += "<p>" + tradetf_favicon + ex + "</p>";
				}
			}
		}

		if (newDetails) {
			item.setAttribute("data-subtitle", newDetails);
		}
	};
	ael(item, attrs, attrs['data-subtitle'].value);
}

// Initial event interop
// Note: TF2Outpost.com doesn't require a mutation interop
var InitialInterop = function () {
	var items = document.getElementsByClassName("item");
	var item, attrs, i;
	for (i=0; i<items.length; i++) {
		try {
			INTERNAL_addItem(items[i]);
		}
		catch (ex) {
			console.log(ex);
		}
	}
};

// Level 1 callback function
var intermediate = function() {

	// Level 2 callback function
	var listen = function() {
		if (Options.PRICES_SHOW_ON_TF2OP(optionsStore)) {
			var t = Date.now();

			// Functions
			InitialInterop();
			console.log((Date.now() - t).toString() + " ms");
		}
	};

	// Level 2 kvStore request
	optionsStore = new kvStore("pricyOptions", listen, false);
}

// Level 1 kvStore request
var optionsStore;
console.log("ON OPTF!");
var itemsStore = new kvStore("pricyItems", intermediate, false);
