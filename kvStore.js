/* An in-memory-based, chrome.storage-backed key-value store */
/* Since Javascript doesn't offer any good mutex solutions, we enforce the mutex
   condition by only marking one instance of each kvStore as 'writable' */
function kvStore(name, initCallback, writable) {

	// In-memory KV store (backed by chrome.storage)
	this.kvName = name;
	this.kvObj = {};
	this.writable = writable;

	// Constructor - can also be used to update a kvStore
	this.kvInit = function(initCallback) {
		var me = this;
		chrome.storage.local.get(
			me.kvName,
			function(kvs) {
				me.kvObj = kvs[name] || {};

				// Execute user-defined function
				if (typeof initCallback === "function") {
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
		if (!this.writable) { throw this.kvName + " is read only" }
		this.kvObj[k] = v;
	}
};
