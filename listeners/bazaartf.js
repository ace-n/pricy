/* Pricy data-interop for Bazaar.tf */
var BazaarTFListener = {

	// Vars
	loadTime: null,
	optionsStore: null,
	itemsStore: null,

	// Favicon URLs
	wh_favicon: null,
	tradetf_favicon: null,

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

	// TF2WH item adding helper function
	INTERNAL_addItemTF2WH: function (item, attrs) {
		
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
		var json = PricyQuery.queryTF2WH(BazaarTFListener.itemsStore, name, craftable);
		
		// Common add-item logic
		return commonAddItemTF2WH(BazaarTFListener.optionsStore, json, BazaarTFListener.wh_favicon, customNamed);
	},

	// Trade.tf item adding helper function
	INTERNAL_addItemTradeTF: function (item, attrs) {
		
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
			craftable = (notes.value.indexOf("(Not Craftable)") === -1);

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
		ael = function(item, attrs, origDetails) {

			// Get data
			var newDetails = attrs['data-details'].value;
			if (origDetails)
				newDetails = origDetails;
			else if (!newDetails)
				newDetails = "";

			// Query TF2WH
			var tryingLater = false;
			if (Options.PRICES_SHOW_TF2WH(BazaarTFListener.optionsStore)) {
				try {
					newDetails += BazaarTFListener.INTERNAL_addItemTF2WH(item, attrs);
				}
				catch (ex) {
					tryingLater = true;
					setTimeout(function(newDetails) { ael(item, attrs, origDetails); }, 250);
					newDetails += "<p>" + wh_favicon + ex + "</p>";
				}
			}

			// Query Trade.tf
			if (Options.PRICES_SHOW_TRADETF(BazaarTFListener.optionsStore)) {
				try {
					newDetails += BazaarTFListener.INTERNAL_addItemTradeTF(item, attrs)
				}
				catch (ex) {
					if (!tryingLater) {
						setTimeout(function(newDetails) { ael(item, attrs, origDetails); }, 250);
					}
					tryingLater = true;
					newDetails += "<p>" + BazaarTFListener.tradetf_favicon + ex + "</p>";
				}
			}

			if (newDetails) {
				item.setAttribute("data-details", newDetails);
			}
		};
		ael(item, attrs, attrs['data-details'].value);
	}
}

// Load time tracker
BazaarTFListener.loadTime = Date.now();

// Init favicon URLs
BazaarTFListener.wh_favicon = BazaarTFListener.favify('/icons/wh.ico'),
BazaarTFListener.tradetf_favicon = BazaarTFListener.favify('/icons/tradetf.ico'),

// Init kvStores + Level 1 callbacks
BazaarTFListener.itemsStore = new kvStore("pricyItems", BazaarTFListener.intermediate, false);
