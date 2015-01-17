var PricyQuery = {

	/* Normalize query names */
	normalizeName: function(name, removeThe) {

		// Convert strange types (eg. "Face-melting") to "Strange"
		var types = [
			// Original strange types
			"Unremarkable","Scarcely Lethal","Mildly Menacing","Somewhat Threatening",
			"Uncharitable","Notably Dangerous","Sufficiently Lethal","Truly Feared",
			"Spectacularly Lethal","Gore-Spattered","Wicked Nasty","Positively Inhumane",
			"Totally Ordinary","Face-Melting","Rage-Inducing","Server-Clearing","Epic",
			"Legendary","Australian","Hale's Own",

			// Additional strange types
			"Scarcely Shocking","Mildly Magnetizing","Somewhat Inducting","Unfortunate",
			"Notably Deleterious","Sufficiently Ruinous","Truly Conducting","Spectacularly Pseudoful",
			"Ion-Spattered","Wickedly Dynamizing","Positively Plasmatic","Circuit-Melting",
			"Nullity-Inducing","Mann Co. Select",

			// More strange types
			"Garish"];
		var i;
		for (i=0; i<20; i++) {
			name = name.replace(new RegExp("^" + types[i] + " "), "Strange ");
		}

		// Remove 'the'
		if (removeThe) {
			name = name.replace(new RegExp("^The "),"");
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

		// Check against hardcoded items
		switch (name) {
			case "Scrap Metal":
				return {"l": 0.11, "h": 0.11, "u":"Refined Metal", "uh": "gear"};
			case "Reclaimed Metal":
				return {"l": 0.33, "h": 0.33, "u":"Refined Metal", "uh": "gear"};
			case "Refined Metal":
				return {"l": 1, "h": 1, "u": "Refined Metal", "uh": "gear"};
			// Items that are (incorrectly) listed as both craftable and non-craftable on Trade.tf
			case "Tour of Duty Ticket":
			case "Squad Surplus Voucher":
				if (craftable) {
					return null;
				}
			default:
				break;
		}

		// Determine item type
		var t,i;
		var type = 'n'; // Unique
		if (asPart) {
			type = 'p'; // Part ('bonus when equipped')
		}
		else if (name.match(new RegExp("^Strange .?Part:"))) {
			/* Don't replace the "Strange" in "Strange Part" */
		}
		else if (craftable) {
			types = ["Strange ", "Vintage ", "Genuine ", "Haunted "];
			for (i=0; i<types.length; i++) {
				t = types[i];
				if (name.indexOf(t) == 0) {
					name = name.slice(t.length);
					type = t.charAt(0).toLowerCase();
					break;
				}
			}
		} else {
			type = 'u'; // Uncraftable
		}

		// Re-query Trade.tf iff. current cache is expired
		exp = kvStore.kvGet("trd-exp");
		lock = kvStore.kvGet("trd-querying") === "1";
		if (!exp || exp < Date.now() || lock) {
			PricyQuery.updateTradeTF();
			throw "Querying Trade.tf..."
		}

		// Grab from cache if JSON and type are valid
		var json = kvStore.kvGet("trd_" + name);
		if (!json) { return null; }
		var price;
		try {
			price = json[type];
			if (!price) {
				return null;
			}
			else if (price === "?") {
				return "?";
			}
		}
		catch (ex) {
			return null;
		}

		// Convert raw price into parseable JSON
		var priceBounds = price.match(new RegExp("(\\d|\\.)+", "gm"));
		var priceLo = priceBounds[0];
		var priceHi = priceBounds[priceBounds.length - 1];

		var priceAbbr = price.match(new RegExp("\\w+$"))[0];
		var priceUnit;
		var priceUnitHTML;

		switch (priceAbbr) {
			case "ref":
				priceUnit = "Refined Metal";
				priceUnitHTML = "gear"
				break;
			case "key":
			case "keys":
				priceUnit = "Mann Co. Supply Crate Key";
				priceUnitHTML = "key"
				break;
			case "bud":
			case "buds":
				priceUnit = "Earbuds";
				priceUnitHTML = "headphones"
				break;
			default:
				throw "Invalid priceAbbr";
		}

		//json = '{"l":' + priceLo + ',"h":' + priceHi + ',"u":"' + priceUnit + '","uh":"' + priceUnitHTML + '"}';
		json = {"l": priceLo, "h": priceHi, "u": priceUnit, "uh": priceUnitHTML};

		// Done!
		return json;
	},

	// Actually query trade.tf itself
	updateTradeTF: function () {
		rowFunc = function (response) {
			var dp = new DOMParser();
			var dom = dp.parseFromString(response, "text/html");
			var ss = dom.getElementById("spreadsheet");
			return ss.getElementsByTagName("tr");
		};
		callback = function(rows) { 
			var i, j;
			var c_unique, c_part, c_uncraft, c_vintage, c_genuine, c_strange, c_haunted;
			for (i=0; i<rows.length; i++) {

				// Get name
				var name = rows[i].getElementsByTagName("th")[0].innerText.trim();

				// Check for "bonus when equipped"
				var bwe_idx = name.indexOf("\n");
				if (bwe_idx != -1) {
					name = name.slice(0, bwe_idx);
				}

				// Get values
				c_unique=c_part=c_uncraft=c_vintage=c_genuine=c_strange=c_haunted="";
				var cols = rows[i].getElementsByTagName("td");
				try { c_unique  = cols[1].children[0].innerText.trim(); } catch(e) {}
				if (bwe_idx != -1) {
					try { c_part    = cols[1].children[2].innerText.trim(); } catch(e) {}
				}
				try { c_uncraft = cols[2].children[0].innerText.trim() || "?"; } catch(e) {}
				try { c_vintage = cols[3].children[0].innerText.trim() || "?"; } catch(e) {}
				try { c_genuine = cols[4].children[0].innerText.trim() || "?"; } catch(e) {}
				try { c_strange = cols[5].children[0].innerText.trim() || "?"; } catch(e) {}
				try { c_haunted = cols[6].children[0].innerText.trim() || "?"; } catch(e) {}

				// Convert values to JSON
				//var json = '{"n":"' + c_unique + '","p":"' + c_part + '","u":"' + c_uncraft + '","v":"' + c_vintage + '","g":"' + c_genuine + '","s":"' + c_strange + '","h":"' + c_haunted + '"}'; 
				json = {"n": c_unique, "p": c_part, "u": c_uncraft, "v": c_vintage, "g": c_genuine, "s": c_strange, "h": c_haunted}; 

				// Log JSON in cache
				kvStore.kvSet("trd_" + PricyQuery.normalizeName(name, true), json);
			}

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

		// Re-query TF2WH iff. current cache is expired
		exp = kvStore.kvGet("wh-exp");
		lock = kvStore.kvGet("wh-querying") === "1";
		if (!exp || exp < Date.now() || lock) {
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
				//i_toJson = '{"bp":' + i_buyPrice + ',"bc":"' + i_buyConv + '","sp":' + i_sellPrice + ',"sc":"' + i_sellConv + '","sp-u":' + i_sellPrice_u + ',"sc-u":"' + i_sellConv_u + '","h":' + i_stock_cur + ',"m":' + i_stock_max + '}';
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
kvStore.kvInit(function() {
	kvStore.kvSet("wh-querying", "0");
	kvStore.kvSet("trd-querying", "0");
	kvStore.kvSet("bptf-querying", "0");
});
