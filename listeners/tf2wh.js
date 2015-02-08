/* Pricy data-interop for TF2WH */
var TF2WHListener = {

	// Vars
	loadTime: null,
	optionsStore: null,
	itemsStore: null,

	// Favicon URLs
	wh_favicon: null,
	tradetf_favicon: null,

	// Helper function
	favify: function(url) {
		return "<img class='pricy-favicon pricy-tf2wh' src='" + chrome.extension.getURL(url) + "' /> ";
	},

	// Initial event interop
	InitialInterop: function () {
		var items = document.getElementsByClassName("entry");
		var item, attrs, i;
		for (i=0; i<items.length; i++) {
			try {
				TF2WHListener.INTERNAL_addItem(items[i]);
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
			if (Options.PRICES_SHOW_ON_TF2WH(TF2WHListener.optionsStore)) {

				// Functions
				TF2WHListener.InitialInterop();
				console.log("[Pricy] Load time:" + (Date.now() - TF2WHListener.loadTime).toString() + " ms");
			}
		};

		// Level 2 kvStore request
		TF2WHListener.optionsStore = new kvStore("pricyOptions", listen, false);
	},

	// TF2WH item adding helper function
	INTERNAL_addItemTF2WH: function (item, attrs) {
		
		// Get data
		var name = attrs["name"].value;
		var customNamed = Misc.startsWith(name, "''");
		var craftable = true;

		// Query TF2WH (and throw an exception if query fails)
		var json = PricyQuery.queryTF2WH(TF2WHListener.itemsStore, name, craftable);
		
		// Common add-item logic
		return commonAddItemTF2WH(TF2WHListener.optionsStore, json, TF2WHListener.wh_favicon, customNamed);
	},

	// Trade.tf item adding helper function
	INTERNAL_addItemTradeTF: function (item, attrs) {
		
		// Get initial data
		var name = attrs["name"].value;
		var customNamed = Misc.startsWith(name, "''");
		var craftable = true;

		// Query Trade.tf (and throw an exception if query fails)
		var json = PricyQuery.queryTradeTF(TF2WHListener.itemsStore, name, craftable, false);

		// Common add-item logic
		return commonAddItemTradeTF(TF2WHListener.itemsStore, TF2WHListener.optionsStore, json, TF2WHListener.tradetf_favicon, customNamed, []);
	},

	// Master item adding helper function
	INTERNAL_addItem: function (item) {

		// Get values
		attrs = item.attributes;
		if (!attrs)
			return null;

		// Add additional data
		ael = function(item, attrs) {

			// Get data
			var popup = document.createElement("div");
			popup.className = "pricy-tf2wh pricy-popup";
			//console.log(popup);

			// Query TF2WH
			var tryingLater = false;
			var content = "";
			if (Options.PRICES_SHOW_TF2WH(TF2WHListener.optionsStore)) {
				try {
					content = TF2WHListener.INTERNAL_addItemTF2WH(item, attrs);
				}
				catch (ex) {
					setTimeout(function(newDetails) { ael(item, attrs); }, 250);
					tryingLater = true;
					content = "<p>" + TF2WHListener.wh_favicon + ex + "</p>";
				}
				popup.appendChild(Misc.parseHTML(content));
			}

			// Query Trade.tf
			content = "";
			if (Options.PRICES_SHOW_TRADETF(TF2WHListener.optionsStore)) {
				try {
					content = TF2WHListener.INTERNAL_addItemTradeTF(item, attrs);
				}
				catch (ex) {
					if (!tryingLater) {
						setTimeout(function(newDetails) { ael(item, attrs); }, 250);
					}
					tryingLater = true;
					content += "<p>" + TF2WHListener.tradetf_favicon + ex + "</p>";
				}
				popup.appendChild(Misc.parseHTML(content));
			}

			// Add popup
			item.appendChild(popup);

			// Show popup
			item.addEventListener("mouseover", function() { 


			});
		};
		ael(item, attrs);
	}
}

// Load time tracker
TF2WHListener.loadTime = Date.now();

// Init favicon URLs
TF2WHListener.wh_favicon = TF2WHListener.favify('/icons/wh.ico'),
TF2WHListener.tradetf_favicon = TF2WHListener.favify('/icons/tradetf.ico'),

// Init kvStores + Level 1 callbacks
TF2WHListener.itemsStore = new kvStore("pricyItems", TF2WHListener.intermediate, false);