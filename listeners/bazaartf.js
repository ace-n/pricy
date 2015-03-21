/* Pricy data-interop for Bazaar.tf */
var BazaarTFListener = {

	// Vars
	loadTime: null,
	optionsStore: null,
	itemsStore: null,

	// Favicon URLs
	wh_favicon: null,
	tradetf_favicon: null,
	bptf_favicon: null,

	// Helper function
	favify: function(url) {
		return "<img class='pricy-favicon pricy-bazaartf' src='" + chrome.extension.getURL(url) + "' /> ";
	},

	// Initial event interop
	InitialInterop: function () {
		var items = document.getElementsByClassName("item");
		var item, attrs, i;
		for (i=0; i<items.length; i++) {
			try {
				BazaarTFListener.INTERNAL_addItem(items[i]);
			}
			catch (ex) {
				console.log(ex);
			}
		}
	},

	// Mutation interop
	MutationInterop: function () {
		
		var item_lists = document.getElementsByClassName("item-list");
		var i;
		for (i=0; i<item_lists.length; i++) {
			 
			// Create observer
			var ob = new MutationObserver(function(ms) {
				ms.forEach(function(m) {
					items = m.addedNodes;
					for (i=0; i<items.length; i++) {
						try {
							BazaarTFListener.INTERNAL_addItem(items[i]);
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
	},

	// Level 1 callback function
	intermediate: function() {

		// Level 2 callback function
		var listen = function() {
			if (Options.PRICES_SHOW_ON_BAZAAR(BazaarTFListener.optionsStore)) {

				// Functions
				BazaarTFListener.InitialInterop();
				BazaarTFListener.MutationInterop();
				console.log("[Pricy] Load time:" + (Date.now() - BazaarTFListener.loadTime).toString() + " ms");
			}
		};

		// Level 2 kvStore request
		BazaarTFListener.optionsStore = new kvStore("pricyOptions", listen, false);
	},

	// TF2WH item adding helper function (will throw an exception if query fails?)
	INTERNAL_addItemTF2WH: function (item, attrs, name, craftable, notes, customNamed) {
		var json = PricyQuery.queryTF2WH(BazaarTFListener.itemsStore, name, craftable);
		return commonAddItemTF2WH(BazaarTFListener.optionsStore, json, BazaarTFListener.wh_favicon, customNamed);
	},

	// Trade.tf item adding helper function
	INTERNAL_addItemTradeTF: function (item, attrs, name, craftable, notes, customNamed) {
			
		// Get additional parts (strange addons/paints)
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
				// - Paints
				else if (Misc.startsWith(line, "Painted: ")) {
					var paint = line.slice(9);
					if (name != paint)
						parts.push(paint);
				}
				// - Skip first line (if we're dealing with strange attributes),
				//   since it's not an additional part
				else if (isFirstLine) { isFirstLine = false; }
				// - Skip "Crafted/Gifted by" lines
				else if (Misc.startsWith(line, "Crafted by ") || Misc.startsWith(line, "Gifted on ")) {}
				// - Strange [Cosmetic] Parts
				else {
					pName = line.replace(new RegExp(/:.+$/), "");
					if (PricyQuery.queryTradeTF(BazaarTFListener.itemsStore, "Strange Cosmetic Part: " + pName, true, false)) {
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
		var json = PricyQuery.queryTradeTF(BazaarTFListener.itemsStore, name, craftable, false);

		// Common add-item logic
		return commonAddItemTradeTF(BazaarTFListener.itemsStore, BazaarTFListener.optionsStore, json, BazaarTFListener.tradetf_favicon, customNamed, parts);
	},

	// Backpack.tf item adding helper function
	INTERNAL_addItemBPTF: function (item, attrs, name, craftable, notes, customNamed) {
		var json = PricyQuery.queryBPTF(BazaarTFListener.itemsStore, name, craftable);
		return commonAddItemBPTF(BazaarTFListener.itemsStore, BazaarTFListener.optionsStore, json, BazaarTFListener.bptf_favicon, customNamed);
	},

	// Master item adding helper function
	INTERNAL_addItem: function (item) {

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
		ael = function(item, attrs) {

			// Get data
			var newDetails = "";

			// Get specific item attributes
			var name = attrs["data-name"].value;
			var customNamed = Misc.startsWith(name, "&quot;");
			if (customNamed)
				name = attrs["data-details"].value.replace(new RegExp("^Level \\d+ "), "");
			var notes = attrs["data-notes"];
			var craftable = notes ? (notes.value.indexOf("(Uncraftable)") === -1) : true;

			// Generic query handler
			var f = function(m, favicon, item, attrs, name, craftable, notes, customNamed) {
				try {
					return m(item, attrs, name, craftable, notes, customNamed);
				}
				catch (ex) {
					console.log(ex);
					return "<p>" + favicon + "&nbsp;" + ex + "</p>";
				}
			}

			// Run queries
			if (Options.PRICES_SHOW_TF2WH(BazaarTFListener.optionsStore))
				newDetails += f(BazaarTFListener.INTERNAL_addItemTF2WH, BazaarTFListener.wh_favicon, item, attrs, name, craftable, notes, customNamed);
			if (Options.PRICES_SHOW_TRADETF(BazaarTFListener.optionsStore))
				newDetails += f(BazaarTFListener.INTERNAL_addItemTradeTF, BazaarTFListener.tradetf_favicon, item, attrs, name, craftable, notes, customNamed);
			if (Options.PRICES_SHOW_BPTF(BazaarTFListener.optionsStore))
				newDetails += f(BazaarTFListener.INTERNAL_addItemBPTF, BazaarTFListener.bptf_favicon, item, attrs, name, craftable, notes, customNamed);

			// Append details
			if (newDetails)
				item.setAttribute("data-details", "<div class='pricy-container'>" + newDetails + "</div>");
		};
		ael(item, attrs);
	}
}

// Load time tracker
BazaarTFListener.loadTime = Date.now();

// Init favicon URLs
BazaarTFListener.wh_favicon = BazaarTFListener.favify('/icons/wh.ico'),
BazaarTFListener.tradetf_favicon = BazaarTFListener.favify('/icons/tradetf.ico'),
BazaarTFListener.bptf_favicon = BazaarTFListener.favify('/icons/bptf.ico'),

// Init kvStores + Level 1 callbacks
BazaarTFListener.itemsStore = new kvStore("pricyItems", BazaarTFListener.intermediate, false);
