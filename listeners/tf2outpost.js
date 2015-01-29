/* Pricy data-interop for TF2Outpost.com */
var TF2OutpostListener = {

	// Vars
	loadTime: null,
	optionsStore: null,
	itemsStore: null,

	// Favicon URLs
	wh_favicon: null,
	tradetf_favicon: null,

	// Helper function
	favify: function(url) {
		return "<img class='pricy-favicon pricy-tf2op' src='" + chrome.extension.getURL(url) + "' /> ";
	},

	// Initial event interop
	// Note: TF2Outpost.com doesn't require a mutation interop
	InitialInterop: function () {
		var items = document.getElementsByClassName("item");
		var item, attrs, i;
		for (i=0; i<items.length; i++) {
			try {
				TF2OutpostListener.INTERNAL_addItem(items[i]);
			}
			catch (ex) {
				console.log(ex);
			}
		}
	},

	// Level 1 callback function
	intermediate: function() {

		// Level 2 callback function
		var listen = function() {
			if (Options.PRICES_SHOW_ON_TF2OP(TF2OutpostListener.optionsStore)) {
				var t = Date.now();

				// Functions
				TF2OutpostListener.InitialInterop();
				console.log("[Pricy] Load time:" + (Date.now() - TF2OutpostListener.loadTime).toString() + " ms");
			}
		};

		// Level 2 kvStore request
		TF2OutpostListener.optionsStore = new kvStore("pricyOptions", listen, false);
	},

	// TF2WH item adding helper function
	INTERNAL_addItemTF2WH: function (item, attrs) {
		
		// Get data
		var name = (attrs["data-real-name"] || attrs["data-name"]).value;
		var craftable = true;
		var flags = attrs["data-flags"];
		if (flags)
			craftable = (flags.value.indexOf("(Not Craftable)") === -1);

		// Query TF2WH (and throw an exception if query fails)
		var json = PricyQuery.queryTF2WH(TF2OutpostListener.itemsStore, name, craftable);
		
		// Common add-item logic
		return commonAddItemTF2WH(TF2OutpostListener.optionsStore, json, TF2OutpostListener.wh_favicon, false);
	},

	// Trade.tf item adding helper function
	INTERNAL_addItemTradeTF: function (item, attrs) {
		
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
					if (PricyQuery.queryTradeTF(TF2OutpostListener.itemsStore, "Strange Cosmetic Part: " + pName, true, false)) {
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
		var json = PricyQuery.queryTradeTF(TF2OutpostListener.itemsStore, name, craftable, parts, false);

		// Common add-item logic
		return commonAddItemTradeTF(TF2OutpostListener.optionsStore, json, TF2OutpostListener.tradetf_favicon, false);
	},

	// Master item adding helper function
	INTERNAL_addItem: function (item) {

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
			if (Options.PRICES_SHOW_TF2WH(TF2OutpostListener.optionsStore)) {
				try {
					newDetails += TF2OutpostListener.INTERNAL_addItemTF2WH(item, attrs);
				}
				catch (ex) {
					if (ex !== "Item not found.") {
						console.log(ex);
						tryingLater = true;
						setTimeout(function(newDetails) { ael(item, attrs, origDetails); }, 250);
						newDetails += "<p>" + TF2OutpostListener.wh_favicon + "&nbsp;" + ex + "</p>";
					}
				}
			}

			// Query Trade.tf
			if (Options.PRICES_SHOW_TRADETF(TF2OutpostListener.optionsStore)) {
				try {
					newDetails += TF2OutpostListener.INTERNAL_addItemTradeTF(item, attrs);
				}
				catch (ex) {
					if (ex !== "Item not found.") {
						console.log(ex);
						if (!tryingLater) {
							setTimeout(function(newDetails) { ael(item, attrs, origDetails); }, 250);
						}
						tryingLater = true;
						newDetails += "<p>" + TF2OutpostListener.tradetf_favicon + "&nbsp;" + ex + "</p>";
					}
				}
			}

			if (newDetails) {
				item.setAttribute("data-subtitle", newDetails);
			}
		};
		ael(item, attrs, attrs['data-subtitle'].value);
	}
}

// Load time tracker
TF2OutpostListener.loadTime = Date.now();

// Init favicon URLs
TF2OutpostListener.wh_favicon = TF2OutpostListener.favify('/icons/wh.ico'),
TF2OutpostListener.tradetf_favicon = TF2OutpostListener.favify('/icons/tradetf.ico'),

// Init kvStores + Level 1 callbacks
TF2OutpostListener.itemsStore = new kvStore("pricyItems", TF2OutpostListener.intermediate, false);

