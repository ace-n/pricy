var PricyQuery = {

	/* Normalize query names */
	normalizeName: function(name, removeThe) {

		// TODO: Organize list below from most common to most rare
		// TODO: Bail out of name replacement loop when name changes

		// Convert strange types (eg. "Face-melting") to "Strange"
		var types = [
			// Original types        Invis watch types           Cosmetic types
			"Unremarkable ",         "Scarcely Shocking ",       "Ragged",
			"Scarcely Lethal ",      "Mildly Magnetizing ",      "Tacky",
			"Mildly Menacing ",      "Somewhat Inducting ",      "Secondhand",
			"Somewhat Threatening ", "Unfortunate ",             "Odious",
			"Uncharitable ",         "Notably Deleterious ",     "Garish",
			"Notably Dangerous ",    "Sufficiently Ruinous ",    "Comfortable",
			"Sufficiently Lethal ",  "Truly Conducting ",        "Dapper",
			"Truly Feared ",         "Spectacularly Pseudoful ", "Sharp",
			"Spectacularly Lethal ", "Ion-Spattered ",           "Fancy",
			"Gore-Spattered ",       "Wickedly Dynamizing ",     "Fancy Shmancy",
			"Wicked Nasty ",         "Positively Plasmatic ",    "Fashionable",
			"Positively Inhumane ",  "Circuit-Melting ",         "Glamorous",
			"Totally Ordinary ",     "Nullity-Inducing ",        "Posh",
			"Face-Melting ",         "Mann Co. Select ",         "Fabulous",
			"Rage-Inducing ",                                    "Stunning",
			"Server-Clearing ",                                  "Mannceaux Signature Collection",
			"Epic ",
			"Legendary ",
			"Australian ",
			"Hale's Own "];

		var i, t;
		for (i=0; i<types.length; i++) {
			t = types[i];
			if (Misc.startsWith(name, t)) {
				name = "Strange " + name.slice(t.length);
				break;
			}
		}

		// Remove 'the'
		if (removeThe)
			name = Misc.replaceStart(name, "The ", "");

		// Return
		return name;
	},

	/* Conduct XHRs/XHR caching */
	xhrQuery: function (store, url, prefix, rowsF, callbackF) {

		// Get HTML
		var req = new XMLHttpRequest();
		var callback = callbackF;
		var rows = rowsF;
		req.open("GET", url, true);
		req.onload = function (resp) { callback(store, rows(req.response)); };

		// Send XHR
		req.send(null);
	},

	/* Query backpack.tf */
	queryBackpackTF: function (store, name) {

		// Grab from cache
		name = PricyQuery.normalizeName(name, false);
		var cached = store.kvGet(name + "_bptf");
		if (cached)
			return cached;
	},

	/* Query the trade.tf cache for an individual item */
	queryTradeTF: function (store, name, craftable, asPart) {

		// Normalize name
		name = PricyQuery.normalizeName(name, true);

		// Fetch data from cache
		return store.kvGet("trd_" + (asPart ? "AddonPart " : "") + (craftable ? "" : "Uncraftable ") + name);
	},

	// Trade.tf helper function
	updateItemTradeTF: function (store, name, quality, elem, childIdx) {
		var obj = {};
		if (elem) {
			var child = elem.children[childIdx];
			if (child) {

				var price = child.innerText.trim(); // "?" marks the price as 'existing'
				var json = {};
				if (price) {

					// Convert raw price into parseable JSON
					var priceBounds = price.match(new RegExp("(\\d|\\.)+", "gm"));
					json["l"] = parseFloat(priceBounds[0], 10);
					json["h"] = priceBounds.length == 1 ? json["l"] : parseFloat(priceBounds[1], 10);

					var priceAbbr = price.match(new RegExp("\\w+$"))[0];
					switch (priceAbbr) {
						case "ref":
							json["u"] = "Refined Metal";
							json["uh"] = "gear"
							break;
						case "key":
						case "keys":
							json["u"] = "Mann Co. Supply Crate Key";
							json["uh"] = "key"
							break;
						case "bud":
						case "buds":
							json["u"] = "Earbuds";
							json["uh"] = "headphones"
							break;
						default:
							throw "Invalid priceAbbr";
					}
				}
				else {
					json["l"] = "?";
					json["h"] = "?";
				}

				// Store JSON in memory
				store.kvSet("trd_" + (quality ? quality + " " : "") + name, json);
			}
		}
	},

	// Actually query trade.tf itself - SHOULD ONLY BE CALLED FROM BACKGROUND PAGE
	updateTradeTF: function (store) {
		rowFunc = function (response) {
			var dp = new DOMParser();
			var dom = dp.parseFromString(response, "text/html");
			var ss = dom.getElementById("spreadsheet");
			return ss.getElementsByTagName("tr");
		};
		callback = function(store, rows) { 

			// Update cache with query results
			var i, name, bwe_idx, json, cols;
			for (i=0; i<rows.length; i++) {

				// Get name
				name = rows[i].getElementsByTagName("th")[0].innerText.trim();

				// Check for "bonus when equipped"
				bwe_idx = name.indexOf("\n");
				if (bwe_idx != -1)
					name = name.slice(0, bwe_idx);

				// Update cached values
				json = {};
				cols = rows[i].getElementsByTagName("td");
				name = PricyQuery.normalizeName(name, true);
				PricyQuery.updateItemTradeTF(store, name, "", cols[1], 0);
				if (bwe_idx != -1)
					PricyQuery.updateItemTradeTF(store, name, "AddonPart", cols[1], 2);
				PricyQuery.updateItemTradeTF(store, name, "Uncraftable", cols[2], 0);
				PricyQuery.updateItemTradeTF(store, name, "Vintage", cols[3], 0);
				PricyQuery.updateItemTradeTF(store, name, "Genuine", cols[4], 0);
				PricyQuery.updateItemTradeTF(store, name, "Strange", cols[5], 0);
				PricyQuery.updateItemTradeTF(store, name, "Haunted", cols[6], 0);
			}

			// Reset hardcoded items
			store.kvSet("trd_Scrap Metal", {"l": 0.11, "h": 0.11, "u":"Refined Metal", "uh": "gear"});
			store.kvSet("trd_Reclaimed Metal", {"l": 0.33, "h": 0.33, "u":"Refined Metal", "uh": "gear"});
			store.kvSet("trd_Refined Metal", {"l": 1, "h": 1, "u": "Refined Metal", "uh": "gear"});
			// Items that are (incorrectly) listed as both craftable and non-craftable on Trade.tf
			store.kvSet("trd_Tour of Duty Ticket", null);
			store.kvSet("trd_Squad Surplus Voucher", null);

			// Save kvStore (since a lot of things have just been updated)
			store.kvSet("trd-querying", "0");
			store.kvSave();

			// Done!
			console.log("[Pricy] Trade.tf query complete!");
		};
		PricyQuery.xhrQuery(store, "http://www.trade.tf/spreadsheet", "trd", rowFunc, callback);
	},

	/* Query the TF2WH cache for an individual item */
	queryTF2WH: function (store, name, craftable) {

		// Normalize name
		name = PricyQuery.normalizeName(name, true);
		name = name.replace(new RegExp("^Strange (?=.?Part:)"), "");

		// Handle uncraftable items
		if (!craftable) {

			// Check craftability states
			var variants = 0;
			if (PricyQuery.queryTradeTF(store, name, true, false)) {
				variants++;
			}
			if (PricyQuery.queryTradeTF(store, name, false, false)) {
				variants++;
			}

			// Ignore items TF2WH doesn't accept
			return null
		}

		// Grab from cache
		return store.kvGet("wh_" + name);
	},

	// TF2WH item font conversion helper
	convertFontTF2WH: function (s) {
		s = s.replace("ref", "<span class='fa fa-gear' />");
		s = s.replace(new RegExp("key(s|)"), "<span class='fa fa-key' />");
		s = s.replace(new RegExp("bud(s|)"), "<span class='fa fa-headphones' />");
		return s;
	},

	// Actually query TF2WH itself - SHOULD ONLY BE CALLED FROM BACKGROUND PAGE
	updateTF2WH: function (store) {
		rowFunc = function (response) {
			var dp = new DOMParser();
			var dom = dp.parseFromString(response, "text/html");
			return dom.getElementById("pricelist").getElementsByTagName("tr");
		};
		callback = function (store, rows) {
			var i, cols, th, i_name, clName, i_buyPrice, i_sellPrice, i_stock, i_sIdx, i_stock_cur, i_stock_max, i_buyConv, i_sellConv, i_toJson;

			// Parse HTML
			for (i=0; i<rows.length; i++) {
				cols = rows[i].getElementsByTagName("td");

				/********************* Get data *********************/
				// Name
				th = rows[i].getElementsByTagName("th")[0];
				i_name = th.id;
				if (!i_name) {
					continue;
				}
				if (i_name == "Hat") {
					i_name = "Haunted Hat"; // Undo a hack on TF2WH's part
				}
				clName = th.className;
				if (clName && clName != "base") {
					i_name = clName.charAt(0).toUpperCase() + clName.slice(1) + " " + i_name;
				}

				// Buy/sell price
				i_buyPrice = cols[1].innerText.replace(/,/g,"");
				i_sellPrice = cols[2].innerText.replace(/,/g,"");
				i_sellPrice_u = cols[3].innerText.replace(/,/g,""); // WH Ultimate price
				
				// Stock
				i_stock = cols[0].innerText.replace(/,/g,"");
				i_sIdx = i_stock.indexOf("/");
				i_stock_cur = i_stock.slice(0, i_sIdx);
				i_stock_max = i_stock.slice(i_sIdx+1);

				// Conversions
				i_buyConv = PricyQuery.convertFontTF2WH(cols[1].getAttribute("data-conversion"));
				i_sellConv = PricyQuery.convertFontTF2WH(cols[2].getAttribute("data-conversion"));
				i_sellConv_u = PricyQuery.convertFontTF2WH(cols[3].getAttribute("data-conversion"));

				/**************** Build + store JSON ****************/
				// Build JSON
				i_toJson = {"bp": i_buyPrice, "bc": i_buyConv, "sp": i_sellPrice, "sc": i_sellConv, "sp-u": i_sellPrice_u, "sc-u": i_sellConv_u, "h": i_stock_cur, "m": i_stock_max};

				// Cache JSON
				store.kvSet("wh_" + PricyQuery.normalizeName(i_name, true), i_toJson);
			}; 

			// Save kvStore (since a lot of things have just been updated)
			store.kvSet("wh-querying", "0");
			store.kvSave();
			
			// Done!
			console.log("[Pricy] TF2WH query complete!");
		};
		PricyQuery.xhrQuery(store, "http://www.tf2wh.com/priceguide", "wh", rowFunc, callback);
	}
};
