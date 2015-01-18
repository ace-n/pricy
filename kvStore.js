/* An in-memory-based, chrome.storage-backed KV storage solution */
var kvStore = {

	// In-memory KV store (backed by chrome.storage)
	kvStore: {},
	kvReady: false,

	kvInit: function(callback) {
		if (!kvStore.kvReady) {
			chrome.storage.local.get(
				'pricyKvStore',
				function(ks) {
					kvStore.kvStore = ks["pricyKvStore"] || {};
					kvStore.kvReady = true;

					// Execute user-defined function
					if (callback) {
						setTimeout(callback(), 10);
					}
				}
			);
		} else if(callback) {
			callback();
		}
	},

	kvSave: function() {
		var kvs = kvStore.kvStore;
		console.log("saving!");
		console.log(kvs);
		chrome.storage.local.set({'pricyKvStore': kvs});
	},

	kvGet: function (k) {
		if (!kvStore.kvReady)
			throw "kvStore not yet ready!";
		return kvStore.kvStore[k];
	},

	kvSet: function (k, v) {
		if (!kvStore.kvReady)
			throw "kvStore not yet ready!";
		kvStore.kvStore[k] = v;
	}
};
