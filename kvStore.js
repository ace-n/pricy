/* An in-memory-based, chrome.storage-backed KV storage solution */
/* Since Javascript doesn't offer any good mutex solutions, we enforce the mutex
   condition by making sure each kvStore instance has only one possible writer */
function kvStore(name, initCallback) {

	// In-memory KV store (backed by chrome.storage)
	this.kvName = name;
	this.kvObj = {};

	this.kvInit = function(initCallback) {
		var me = this;
		chrome.storage.local.get(
			me.kvName,
			function(kvs) {
				me.kvObj = kvs[name] || {};

				// Execute user-defined function
				if (initCallback) {
					setTimeout(initCallback(), 10);
				}
			}
		);
	}
	this.kvInit(initCallback);

	this.kvSave = function() {
		var kn = this.kvName;
		chrome.storage.local.set({kn: this.kvObj});
	}

	this.kvGet = function (k) {
		return this.kvObj[k];
	}

	this.kvSet = function (k, v) {
		this.kvObj[k] = v;
	}
};
