/*********************** Alarm logic ***********************/
chrome.alarms.onAlarm.addListener(function (alarm) {

	console.log(alarm.name);

	// Init
	var name = alarm.name;
	var optionsStore = new kvStore("pricyOptions", listen, false); // Keep this updated

	// Query appropriate site
	switch (name) {
		case "tf2wh":
			PricyQuery.queryTF2WH(itemsStore);
			period = Options.UPDATE_TF2WH_FREQUENCY(optionsStore);
			break;
		case "trdTf":
			PricyQuery.queryTradeTF(itemsStore);
			period = Options.UPDATE_TRADETF_FREQUENCY(optionsStore);
			break;
		default:
			throw "Invalid alarm name";
	};

	// Schedule next query
	var period;
	switch (name) {
		case "tf2wh":
			period = Options.UPDATE_TF2WH_FREQUENCY(optionsStore);
			break;
		case "trdTf":
			period = Options.UPDATE_TRADETF_FREQUENCY(optionsStore);
			break;
		default:
			throw "Invalid alarm name";
	};
	chrome.alarms.create(name, {"when": Date.now() + period * 1000});
});

/************************* kvStore *************************/
// Level 1 callback function
var intermediate = function() {

	// Level 2 callback function
	var init = function() {
		// Initial alarm triggers
		chrome.alarms.create("tf2wh", {"when": Date.now() + 500});
		chrome.alarms.create("trdTf", {"when": Date.now() + 1000});
		//chrome.alarms.create("bpTf",  {"when": Date.now() + 1500});
	};

	// Level 2 kvStore request
	optionsStore = new kvStore("pricyOptions", init, false);
};

// Level 1 kvStore request
var optionsStore;
var itemsStore = new kvStore("pricyItems", intermediate, true);
