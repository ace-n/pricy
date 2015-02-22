/*********************** Alarm logic ***********************/
chrome.alarms.onAlarm.addListener(function (alarm) {

	console.log(alarm.name);

	var doQuery = function() {
		// Query appropriate site
		switch (name) {
			case "tf2wh":
				PricyQuery.updateTF2WH(itemsStore);
				break;
			case "trdTf":
				PricyQuery.updateTradeTF(itemsStore);
				break;
			case "bpTf":
				PricyQuery.updateBPTF(itemsStore);
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
				console.log("TRD-TF")
				period = Options.UPDATE_TRADETF_FREQUENCY(optionsStore);
				break;
			case "bpTf":
				period = Options.UPDATE_BPTF_FREQUENCY(optionsStore);
				break;
			default:
				throw "Invalid alarm name";
		};
		chrome.alarms.create(name, {"when": Date.now() + period * 60000});
	}

	// Init
	var name = alarm.name;
	var optionsStore = new kvStore("pricyOptions", doQuery, false); // Keep this updated
});

/************************* kvStore *************************/
// Level 1 callback function
var intermediate = function() {

	// Level 2 callback function
	var init = function() {

		// Initial alarm triggers
		chrome.alarms.create("tf2wh", {"when": Date.now() + 500});
		chrome.alarms.create("trdTf", {"when": Date.now() + 1000});
		chrome.alarms.create("bpTf",  {"when": Date.now() + 1500});
	};

	// Level 2 kvStore request
	optionsStore = new kvStore("pricyOptions", init, false);
};

// Level 1 kvStore request
var optionsStore;
var itemsStore = new kvStore("pricyItems", intermediate, true);

/********************** Page action **************************/
// When the extension is installed or upgraded ...
chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
				pageUrl: { urlMatches: 'tf2(outpost|wh)\.com|bazaar\.tf' },
			})],
			actions: [ 
				new chrome.declarativeContent.ShowPageAction()
			]
		}]);
	});
});
chrome.pageAction.onClicked.addListener(function(tab) {
	console.log("clicked")
    chrome.pageAction.show(tab.id);
});
