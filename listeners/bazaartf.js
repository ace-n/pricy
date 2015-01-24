/* Pricy data-interop for Bazaar.tf */

// Favicon URLs
var wh_favicon = chrome.extension.getURL('/icons/wh.ico');
var tradetf_favicon = chrome.extension.getURL('/icons/tradetf.ico');

// TF2WH item adding helper function
var INTERNAL_addItemTF2WH = function (item, attrs) {
	
	// Get data
	var name = attrs["data-name"].value;
	var customNamed = Misc.startsWith(name, "&quot;");
	var craftable = true;
	if (customNamed)
		name = attrs["data-details"].value.replace(new RegExp("^Level \\d+ "), "");
	var notes = attrs["data-notes"];
	if (notes)
		craftable = (notes.value.indexOf("(Not Craftable)") === -1);

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
				"<p>" +
					"<img style='width: 25px' src='" + wh_favicon + "' />" +
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
				"<img style='width: 25px' src='" + wh_favicon + "' />&nbsp;&nbsp;" +
				(customNamed ? "Custom names not yet supported" : "No match found.") +
			"</p>";
		return asi;
	}
}

// Trade.tf item adding helper function
var INTERNAL_addItemTradeTF = function (item, attrs) {
	
	// Get initial data
	var name = attrs["data-name"].value;
	var customNamed = name.indexOf("&quot;") == 0;
	var craftable = true;
	if (customNamed)
		name = attrs["data-details"].value.replace(new RegExp("^Level \\d+ "), "");
	
	// Get more data + additional parts (strange addons/paints)
	var notes = attrs["data-notes"];
	var parts = [];
	if (notes) {
		var noteLines = (notes.value.slice(1, -1)).split(/<.+?>/g);
		var i, line, pName;
		var dp = new DOMParser();
		var isFirstLine = true;

		for (i=0; i<noteLines.length; i++) {

			// Get line
			line = noteLines[i];
			if (!line || line.length < 2)
				continue; // Skip null lines

			// Record line info
			// - Craftable status
			if (line === "(Not Craftable)")
				craftable = false;
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
					"<p>" +
						"<img style='width: 25px' src='" + tradetf_favicon + "' /> " +
						"TF2WH error: " + ex +
					"</p>";
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
				"<p>" +
					"<img style='width: 25px' src='" + tradetf_favicon + "'/>" +
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

		// Create error message
		var errorMsg = "No match found";
		if (customNamed)
			errorMsg = "Custom names not yet supported";
		else if (json && json["l"] == "?")
			errorMsg = "Price is uncertain";

		// Append to ASI
		asi = 
			"<p style='color:red'>" +
				"<img style='width: 25px' src='" + tradetf_favicon + "' /> " +
				errorMsg +
			"</p>";
		return asi;
	}
}

// Master item adding helper function
var INTERNAL_addItem = function (item) {

	// Get values
	attrs = item.attributes;
	if (!attrs)
		return null;

	// Skip actual non-TF2 items
	else if (!attrs["data-game"] || attrs["data-game"].value != 440)
		return null;

	// Skip internal items (e.g. "Offers")
	else if (!attrs["data-defindex"] || attrs["data-defindex"].value < 0)
		return null;

	// Add additional data
	ael = function(item, attrs, origDetails) {

		// Get data
		var newDetails = attrs['data-details'].value;
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
					newDetails +=
						"<p>" +
							"<img style='width: 25px' src='" + wh_favicon + "' /> " +
							ex +
						"</p>";
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
					newDetails +=
						"<p>" +
							"<img style='width: 25px' src='" + tradetf_favicon + "' /> " +
							ex +
						"</p>";
				}
			}
		}

		if (newDetails) {
			item.setAttribute("data-details", newDetails);
		}
	};
	ael(item, attrs, attrs['data-details'].value);
}

// Initial event interop
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

// Mutation interop
var MutationInterop = function () {
	
	var item_lists = document.getElementsByClassName("item-list");
	var i;
	for (i=0; i<item_lists.length; i++) {
		 
		// Create observer
		var ob = new MutationObserver(function(ms) {
			ms.forEach(function(m) {
				items = m.addedNodes;
				for (i=0; i<items.length; i++) {
					try {
						INTERNAL_addItem(items[i]);
					}
					catch (ex) {
						console.log(ex);
					}
				}
			});    
		});
		 
		// Configure observer
		var config = { attributes: true, childList: true, characterData: true };
		 
		// Register observer
		ob.observe(item_lists[i], config);
	}
}

// Level 1 callback function
var intermediate = function() {

	// Level 2 callback function
	var listen = function() {
		if (Options.PRICES_SHOW_ON_BAZAAR(optionsStore)) {
			var t = Date.now();

			// Functions
			InitialInterop();
			MutationInterop();
			console.log((Date.now() - t).toString() + " ms");
		}
	};

	// Level 2 kvStore request
	optionsStore = new kvStore("pricyOptions", listen, false);
}

// Level 1 kvStore request
var optionsStore;
var itemsStore = new kvStore("pricyItems", intermediate, false);
