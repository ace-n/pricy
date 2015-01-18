/* Pricy data-interop for Bazaar.tf */

// Favicon URLs
var wh_favicon = chrome.extension.getURL('/icons/wh.ico');
var tradetf_favicon = chrome.extension.getURL('/icons/tradetf.ico');

// TF2WH item adding helper function
var INTERNAL_addItemTF2WH = function (item, attrs) {
	
	// Get data
	var name = attrs["data-name"].value;
	var customNamed = name.slice(0,6) === "&quot;";
	var craftable = true;
	if (customNamed) {
		name = attrs["data-details"].value.replace(new RegExp("^Level \\d+ "), "");
	}
	var notes = attrs["data-notes"];
	if (notes) {
		craftable = (notes.value.indexOf("(Not Craftable)") === -1);
	}

	// Query TF2WH (and throw an exception if query fails)
	var newJson = PricyQuery.queryTF2WH(name, craftable);
	
	// Add details to item
	var asi; // "Automatic semicolon insertion" = return statements must be one liners
	var buyPrice, sellPrice, toggle; // Other loop vars
	if (newJson) {
		try {
			//newJson = JSON.parse(newJson);

			// Compute prices
			toggle = (Options.PRICE_DISPLAY_MODE() == 1 ? "c" : "p") + (Options.PRICES_SHOW_ULTIMATE() ? "-u" : "");
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
	} else {
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
	if (customNamed) {
		name = attrs["data-details"].value.replace(new RegExp("^Level \\d+ "), "");
	}
	
	// Get more data + additional parts (strange addons/paints)
	var notes = attrs["data-notes"];
	var parts = [];
	if (notes) {
		var noteLines = notes.value.split(/<.+?>/g);
		var i, line, pName;
		var dp = new DOMParser();

		for (i=0; i<noteLines.length; i++) {

			// Get line
			line = noteLines[i];
			if (!line || line.length < 2) {
				continue; // Skip null lines
			}

			// Record line info
			// - Craftable status
			if (line === "(Not Craftable)") {
				craftable = false;
			}
			// - Paints
			else if (line.slice(0,9) ==="Painted: ") {
				parts.push(line.slice(9));
			}
			// - Skip first line (if we're dealing with strange attributes),
			//   since it's not an additional part
			else if (i === 0) {}
			// - Strange [Cosmetic] Parts
			else {
				pName = line.replace(new RegExp(/:.+$/), "");
				if (PricyQuery.queryTradeTF("Strange Cosmetic Part: " + pName, true, false)) {
					pName = "Strange Cosmetic Part: " + pName;
				} else {
					pName = "Strange Part: " + pName;
				}
				parts.push(pName);
			}
		}
	}

	// Query Trade.tf (and throw an exception if query fails)
	var json = PricyQuery.queryTradeTF(name, craftable, false);
	var asi; // "Automatic semicolon insertion" = return statements must be one liners
	var showParts, i, pJson, loCur, hiCur, keyRefRatio, unitRatio; // Other loop vars
	keyRefRatio = null;
	if (json && json !== "?") {
		try {

			// Init variables
			var loAlone = json["l"];
			var hiAlone = json["h"];
			var loParts = loAlone;
			var hiParts = hiAlone;

			// Calculate lo/hi with parts prices (if applicable)
			showParts = false;
			if (Options.PRICES_SHOW_WITH_PARTS() && parts.length > 0) {
				for (i=0; i<parts.length; i++) {
					try {
						pJson = PricyQuery.queryTradeTF(parts[i], true, true);
						if (pJson) {
							//pJson = JSON.parse(pJson);
							loCur = pJson["l"];
							hiCur = pJson["h"];

							// Make sure part and original item are in terms of the same thing
							if (json["uh"] != pJson["uh"]) {

								// Common vars
								if (!keyRefRatio) {
									keyRefRatio = PricyQuery.queryTradeTF("Mann Co. Supply Crate Key", true, false);
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
					catch (ex) {
						console.log(ex);
					}
				}
			}

			// Convert lo/hi prices to appropriate units
			if (Options.PRICE_DISPLAY_MODE() === 0) {
				try {
					unitRatio = PricyQuery.queryTF2WH(json["u"], true)["bp"];
				} catch (ex) {
					"<p>" +
						"<img style='width: 25px' src='" + tradetf_favicon + "' /> " +
						"TF2WH error: " + ex +
					"</p>";
				}
				loAlone = Misc.centify(loAlone * unitRatio);
				loParts = Misc.centify(loParts * unitRatio);
				hiAlone = Misc.centify(hiAlone * unitRatio);
				hiParts = Misc.centify(hiParts * unitRatio);
			} else {
				loParts = Misc.centify(loParts);
				hiParts = Misc.centify(hiParts);
			}

			// Add details to HTML
			faIcon = (Options.PRICE_DISPLAY_MODE() === 0 ? "" : " <span class='fa fa-" + json["uh"] + "'/>");
			asi = 
				"<p>" +
					"<img style='width: 25px' src='" + tradetf_favicon + "'/>" +
					"&nbsp;&nbsp;<span class='fa fa-square-o'/>&nbsp;&nbsp;" +
					loAlone + (loAlone == hiAlone ? "" : " - " + hiAlone) +
					faIcon;
			if (showParts) {
				asi += 
					",&nbsp;&nbsp;" +
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
	} else {
		asi = 
			"<p style='color:red'>" +
				"<img style='width: 25px' src='" + tradetf_favicon + "' /> " +
				(customNamed ? "Custom names not yet supported" : "No match found.") +
			"</p>";
		return asi;
	}
}

// Master item adding helper function
var INTERNAL_addItem = function (item) {

	// Get values
	attrs = item.attributes;

	// Skip actual non-TF2 items
	if (!attrs["data-game"] || attrs["data-game"].value != 440)
		return null;

	// Skip internal items (e.g. "Offers")
	if (!attrs["data-defindex"] || attrs["data-defindex"].value < 0)
		return null;

	// Add additional data
	ael = function(item, attrs, origDetails) {

		// Get data
		var newDetails = attrs['data-details'].value;
		if (origDetails) {
			newDetails = origDetails;
		} else if (!newDetails) {
			newDetails = "";
		}

		// Query TF2WH
		var tryingLater = false;
		if (Options.PRICES_SHOW_TF2WH()) {
			try {
				newDetails += INTERNAL_addItemTF2WH(item, attrs)
			} catch (ex) {
				console.log(ex);
				tryingLater = true;
				setTimeout(function(newDetails) { ael(item, attrs, origDetails); }, 250);
				newDetails +=
					"<p>" +
						"<img style='width: 25px' src='" + wh_favicon + "' /> " +
						"Updating data..." +
					"</p>";
			}
		}

		// Query Trade.tf
		if (Options.PRICES_SHOW_TRADETF()) {
			try {
				newDetails += INTERNAL_addItemTradeTF(item, attrs)
			} catch (ex) {
				if (!tryingLater) {
					setTimeout(function(newDetails) { ael(item, attrs, origDetails); }, 250);
				}
				tryingLater = true;
				newDetails +=
					"<p>" +
						"<img style='width: 25px' src='" + tradetf_favicon + "' /> " +
						"Updating data..." +
					"</p>";
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

// Run JS
var listen = function() {
	if (Options.PRICES_SHOW_ON_BAZAAR()) {
		var t = Date.now();

		// Functions
		InitialInterop();
		MutationInterop();
		console.log((Date.now() - t).toString() + " ms");
	}
};

/* Init kvStore */
kvStore.kvInit(listen);

/* Save kvStore on window change */
window.onbeforeunload = function () {

	/* These values are not shared between pages, since they
	 only pull copies of this info during the loading phase */
	kvStore.kvSet("wh-querying", "0");
	kvStore.kvSet("trd-querying", "0");
	kvStore.kvSet("bptf-querying", "0");

	// Save
	kvStore.kvSave();
};
