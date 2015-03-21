/* Pricy data-interop for TF2Outpost.com */
var TF2OutpostListener = {

	// Vars
	loadTime: null,
	optionsStore: null,
	itemsStore: null,

	// Favicon URLs
	wh_favicon: null,
	tradetf_favicon: null,
	bptf_favicon: null,

	// Helper function #1
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
	INTERNAL_addItemTF2WH: function (item, attrs, name, craftable) {
		var json = PricyQuery.queryTF2WH(TF2OutpostListener.itemsStore, name, craftable);
		return commonAddItemTF2WH(TF2OutpostListener.optionsStore, json, TF2OutpostListener.wh_favicon, false);
	},

	// Trade.tf item adding helper function
	INTERNAL_addItemTradeTF: function (item, attrs, name, craftable) {

		// Get more data + additional parts (strange addons/paints)
		var notes = attrs["data-attributes"];
		var parts = [];
		if (notes) {
			var noteLines = (notes.value).split(/<.+?>/g);
			var i, line, pName;
			var dp = new DOMParser();
			var isFirstLine = true;

			for (i=0; i<noteLines.length; i++) {

				// Get line
				line = noteLines[i];
				if (!line || line.length < 2)
					continue; // Skip null lines

				// Record line info
				// - Skip first line (if we're dealing with strange attributes),
				//   since it's not an additional part
				else if (isFirstLine) { isFirstLine = false; }
				// - Paints
				else if (noteLines[i-1] == "Painted:")
					parts.push(line.trim());
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
		var json = PricyQuery.queryTradeTF(TF2OutpostListener.itemsStore, name, craftable, false);

		// Common add-item logic
		return commonAddItemTradeTF(TF2OutpostListener.itemsStore, TF2OutpostListener.optionsStore, json, TF2OutpostListener.tradetf_favicon, false, parts);
	},

	// Backpack.tf item adding helper function
	INTERNAL_addItemBPTF: function (item, attrs, name, craftable) {
		var json = PricyQuery.queryBPTF(TF2OutpostListener.itemsStore, name, craftable);
		return commonAddItemBPTF(TF2OutpostListener.itemsStore, TF2OutpostListener.optionsStore, json, TF2OutpostListener.bptf_favicon, false);
	},

	// Master item adding helper function
	INTERNAL_addItem: function (item) {

		// Get values + skip BS items
		attrs = item.attributes;
		if (!attrs || !attrs["data-hash"] || !Misc.startsWith(attrs["data-hash"].value, "440"))
			return null;

		// Add additional data
		ael = function(item, attrs) {

			// Get data
			var newDetails = "";

			// Generic query handler
			var f = function(m, favicon, item, attrs, name, craftable) {
				try {
					return m(item, attrs, name, craftable);
				}
				catch (ex) {
					console.log(ex);
					return "<p>" + favicon + "&nbsp;" + ex + "</p>";
				}
			}

			// Get shared data
			var name = (attrs["data-real-name"] || attrs["data-name"]).value;
			var craftable = true;
			if (attrs["data-flags"])
				craftable = attrs["data-flags"].value.indexOf("(Uncraftable)") === -1;

			// Run queries
			if (Options.PRICES_SHOW_TF2WH(TF2OutpostListener.optionsStore))
				newDetails += f(TF2OutpostListener.INTERNAL_addItemTF2WH, TF2OutpostListener.wh_favicon, item, attrs, name, craftable);
			if (Options.PRICES_SHOW_TRADETF(TF2OutpostListener.optionsStore))
				newDetails += f(TF2OutpostListener.INTERNAL_addItemTradeTF, TF2OutpostListener.tradetf_favicon, item, attrs, name, craftable);
			if (Options.PRICES_SHOW_BPTF(TF2OutpostListener.optionsStore))
				newDetails += f(TF2OutpostListener.INTERNAL_addItemBPTF, TF2OutpostListener.bptf_favicon, item, attrs, name, craftable);

			// Append details
			if (newDetails)
				item.setAttribute("data-subtitle", "<div class='pricy-container'>" + newDetails + "</div>");
		};
		ael(item, attrs);
	}
}

// Load time tracker
TF2OutpostListener.loadTime = Date.now();

// Init favicon URLs
TF2OutpostListener.wh_favicon = TF2OutpostListener.favify('/icons/wh.ico'),
TF2OutpostListener.tradetf_favicon = TF2OutpostListener.favify('/icons/tradetf.ico'),
TF2OutpostListener.bptf_favicon = TF2OutpostListener.favify('/icons/bptf.ico'),

// Init kvStores + Level 1 callbacks
TF2OutpostListener.itemsStore = new kvStore("pricyItems", TF2OutpostListener.intermediate, false);

