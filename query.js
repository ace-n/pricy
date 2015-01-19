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
			if (name.slice(0, t.length) === t) {
				name = "Strange " + name.slice(t.length);
				break;
			}
		}

		// Remove 'the'
		if (removeThe) {
			name = Misc.replaceStart(name, "The ", "");
		}

		// Return
		return name;
	},

	/* Conduct XHRs/XHR caching */
	xhrQuery: function (url, prefix, rowsF, callbackF) {
		
		// Don't repeat XHR queries
		if (kvStore.kvGet(prefix + "-querying") === "1") {
			return null;
		}
		kvStore.kvSet(prefix + "-querying", "1");

		// Set timeout (done here in case a request fails)
		var ms = Date.now() + 60000*Options.UPDATE_TRADETF_FREQUENCY();
		kvStore.kvSet(prefix + "-exp", ms);

		// Get HTML
		var req = new XMLHttpRequest();
		var callback = callbackF;
		var rows = rowsF;
		req.open("GET", url, true);
		req.onload = function (resp) { console.log(callback(rows(req.response))); };

		// Send XHR
		req.send(null);
	},

	/* Query backpack.tf */
	queryBackpackTF: function (name) {

		// Grab from cache
		name = PricyQuery.normalizeName(name, false);
		var cached = kvStore.kvGet(name + "_bptf");
		if (cached) {
			return cached;
		}
	},

	/* Query the trade.tf cache for an individual item */
	queryTradeTF: function (name, craftable, asPart) {

		// Normalize name
		name = PricyQuery.normalizeName(name, true);

		// Throw "Querying..." error if a query is currently in progress
		if (kvStore.kvGet("trd-querying") === "1") {
			throw "Querying Trade.tf..."
		}

		// Re-query Trade.tf iff. current cache is expired
		exp = kvStore.kvGet("trd-exp");
		if (!exp || exp < Date.now()) {
			PricyQuery.updateTradeTF();
			throw "Querying Trade.tf..."
		}

		// Fetch data from cache
		var result = kvStore.kvGet("trd_" + (asPart ? "AddonPart " : "") + (craftable ? "" : "Uncraftable ") + name);
		if (result) {
			return result;
		} else {

		}
	},

	// Actually query trade.tf itself
	updateItemTradeTF: function (name, quality, elem, childIdx) {
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
				kvStore.kvSet("trd_" + (quality ? quality + " " : "") + name, json);
			}
		}
	},

	updateTradeTF: function () {
		rowFunc = function (response) {
			var dp = new DOMParser();
			var dom = dp.parseFromString(response, "text/html");
			var ss = dom.getElementById("spreadsheet");
			return ss.getElementsByTagName("tr");
		};
		callback = function(rows) { 

			// Update cache with query results
			var i, name, bwe_idx, json, cols;
			for (i=0; i<rows.length; i++) {

				// Get name
				name = rows[i].getElementsByTagName("th")[0].innerText.trim();

				// Check for "bonus when equipped"
				bwe_idx = name.indexOf("\n");
				if (bwe_idx != -1) {
					name = name.slice(0, bwe_idx);
				}

				// Update cached values
				json = {};
				cols = rows[i].getElementsByTagName("td");
				name = PricyQuery.normalizeName(name, true);
				PricyQuery.updateItemTradeTF(name, "", cols[1], 0);
				if (bwe_idx != -1) {
					PricyQuery.updateItemTradeTF(name, "AddonPart", cols[1], 2);
				}
				PricyQuery.updateItemTradeTF(name, "Uncraftable", cols[2], 0);
				PricyQuery.updateItemTradeTF(name, "Vintage", cols[3], 0);
				PricyQuery.updateItemTradeTF(name, "Genuine", cols[4], 0);
				PricyQuery.updateItemTradeTF(name, "Strange", cols[5], 0);
				PricyQuery.updateItemTradeTF(name, "Haunted", cols[6], 0);
			}

			// Reset hardcoded items
			kvStore.kvSet("trd_Scrap Metal", {"l": 0.11, "h": 0.11, "u":"Refined Metal", "uh": "gear"});
			kvStore.kvSet("trd_Reclaimed Metal", {"l": 0.33, "h": 0.33, "u":"Refined Metal", "uh": "gear"});
			kvStore.kvSet("trd_Refined Metal", {"l": 1, "h": 1, "u": "Refined Metal", "uh": "gear"});
			// Items that are (incorrectly) listed as both craftable and non-craftable on Trade.tf
			kvStore.kvSet("trd_Tour of Duty Ticket", null);
			kvStore.kvSet("trd_Squad Surplus Voucher", null);

			// Save kvStore (since a lot of things have just been updated)
			kvStore.kvSet("trd-querying", "0");
			kvStore.kvSave();

			// Done!
			console.log("[Pricy] Trade.tf query complete!");
		};
		PricyQuery.xhrQuery("http://www.trade.tf/spreadsheet", "trd", rowFunc, callback);
	},

	/* Query the TF2WH cache for an individual item */
	queryTF2WH: function (name, craftable) {

		// Normalize name
		name = PricyQuery.normalizeName(name, true);
		name = name.replace(new RegExp("^Strange (?=.?Part:)"), "");

		// Handle uncraftable items
		if (!craftable) {

			// Check craftability states
			var variants = 0;
			if (PricyQuery.queryTradeTF(name, true, false)) {
				variants++;
			}
			if (PricyQuery.queryTradeTF(name, false, false)) {
				variants++;
			}

			// Return null if TF2WH doesn't accept this item
			if (variants == 2) {
				return null;
			}
		}

		// Throw "Querying..." error if a query is currently in progress
		if (kvStore.kvGet("trd-querying") === "1") {
			throw "Querying Trade.tf..."
		}

		// Re-query TF2WH iff. current cache is expired
		exp = kvStore.kvGet("wh-exp");
		if (!exp || exp < Date.now()) {
			PricyQuery.updateTF2WH();
			throw "Querying TF2WH..."
		}

		// Grab from cache
		return kvStore.kvGet("wh_" + name);
	},

	// TF2WH item font conversion helper
	convertFontTF2WH: function (s) {
		s = s.replace("ref", "<span class='fa fa-gear' />");
		s = s.replace(new RegExp("key(s|)"), "<span class='fa fa-key' />");
		s = s.replace(new RegExp("bud(s|)"), "<span class='fa fa-headphones' />");
		return s;
	},

	// Actually query TF2WH itself
	updateTF2WH: function () {
		rowFunc = function (response) {
			var dp = new DOMParser();
			var dom = dp.parseFromString(response, "text/html");
			return dom.getElementById("pricelist").getElementsByTagName("tr");
		};
		callback = function (rows) {
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
				kvStore.kvSet("wh_" + PricyQuery.normalizeName(i_name, true), i_toJson);
			}; 

			// Save kvStore (since a lot of things have just been updated)
			kvStore.kvSet("wh-querying", "0");
			kvStore.kvSave();
			
			// Done!
			console.log("[Pricy] TF2WH query complete!");
		};
		PricyQuery.xhrQuery("http://www.tf2wh.com/priceguide", "wh", rowFunc, callback);
	}
};

// Run JS (TODO get sync working correctly)
kvStore.kvInit(null);
