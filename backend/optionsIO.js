var Options = {

	/* List of frequencies with their periods in minutes */
	FREQUENCIES: ["15 mins", "30 mins", "1 hour", "3 hours", "6 hours", "12 hours", "1 day"],
	PERIODS: [15, 30, 60, 60*3, 60*6, 60*12, 60*24],

	/* Specify whether 'normal failures' are shown */
	ITEMS_SHOW_NORMAL_FAILURES: function (optionsStore) {
		return optionsStore.kvGet("PRICES_SHOW_NORMAL_FAILURES") != 1;
	},

	/* Specify how TF2WH stock info is displayed
	 * - 0 = Display stock info as current/max
	 * - 1 = Display stock info as a percentage
	 * - 2 = Don't display stock info
	 */
	PRICES_STOCK_DISPLAY_MODE: function (optionsStore) {
		return parseInt(optionsStore.kvGet("PRICES_STOCK_DISPLAY_MODE"),10) || 0;
	},

	/* Specify whether Trade.tf "with parts" prices are displayed 
	 * - 0 = Display item-only price
	 * - 1 = Display with parts price (if available)
	 * - 2 = Display both prices
	*/
	PRICES_PARTS_DISPLAY_MODE: function (optionsStore) {
		return parseInt(optionsStore.kvGet("PRICES_PARTS_DISPLAY_MODE"), 10) || 2;
	},

	/* Specify whether Free or Premium (Ultimate) prices are shown for TF2WH */
	PRICES_SHOW_ULTIMATE: function (optionsStore) {
		return optionsStore.kvGet("PRICES_SHOW_ULTIMATE") === 1;
	},

	/* Specify whether TF2WH buy/sell prices are shown with "N/A" if stock doesn't allow it */
	PRICES_SHOW_NA_IF_IMPOSSIBLE: function (optionsStore) {
		return optionsStore.kvGet("PRICES_SHOW_NA_IF_IMPOSSIBLE") != 0;
	},

	/* Specify price display mode
	 * - 0 = All prices in WHc
	 * - 1 = All prices in items (ref/keys/buds)
	 */
	PRICE_CURRENCY_MODE: function (optionsStore) {
		return optionsStore.kvGet("PRICE_CURRENCY_MODE") === "1" ? 1 : 0;
	},

	/******************************************************/
	/* Specify whether TF2WH stats are displayed */
	PRICES_SHOW_TF2WH: function (optionsStore) {
		return optionsStore.kvGet("PRICES_SHOW_TF2WH") != 0;
	},

	/* Specify whether Trade.tf stats are displayed */
	PRICES_SHOW_TRADETF: function (optionsStore) {
		return optionsStore.kvGet("PRICES_SHOW_TRADETF") != 0;
	},

	/* Specify whether Backpack.tf stats are displayed */

	/******************************************************/
	/* Specify TF2WH update frequency (in minutes) */
	UPDATE_TF2WH_FREQUENCY: function (optionsStore) {
		return 15;
	},

	/* Specify Trade.tf update frequency (in minutes) */
	UPDATE_TRADETF_FREQUENCY: function (optionsStore) {
		return 15;
	},

	/******************************************************/
	/* Specify whether stats are displayed on Bazaar.tf */
	PRICES_SHOW_ON_BAZAAR: function (optionsStore) {
		return optionsStore.kvGet("PRICES_SHOW_ON_BAZAAR") != 0;
	},

	/* Specify whether stats are displayed on TF2Outpost.com */
	PRICES_SHOW_ON_TF2OP: function (optionsStore) {
		return optionsStore.kvGet("PRICES_SHOW_ON_TF2OP") != 0;
	},

	/* Specify whether stats are displayed on Trade.tf */

	/* Specify whether stats are displayed on TF2WH.com */
	PRICES_SHOW_ON_TF2WH: function (optionsStore) {
		return optionsStore.kvGet("PRICES_SHOW_ON_TF2WH") != 0;
	}
}
