var Options = {

	/* List of frequencies with their periods in minutes */
	FREQUENCIES: ["15 mins", "30 mins", "1 hour", "3 hours", "6 hours", "12 hours", "1 day"],
	PERIODS: [15, 30, 60, 60*3, 60*6, 60*12, 60*24],

	/* Specify whether Trade.tf "with parts" prices are displayed */
	PRICES_SHOW_WITH_PARTS: function () {
		return true;
	},

	/* Specify whether Free or Premium (Ultimate) prices are shown for TF2WH */
	PRICES_SHOW_ULTIMATE: function () {
		return false;
	},

	/* Specify whether TF2WH buy/sell prices are shown with "N/A" if stock doesn't allow it */
	PRICES_SHOW_NA_IF_IMPOSSIBLE: function () {
		return "TODO";
	},

	/* Specify price display mode
	 * - 0 = All prices in WHc
	 * - 1 = All prices in items (ref/keys/buds)
	 * - 2 = WH prices in WHc, others in items
	 */
	PRICE_DISPLAY_MODE: function () {
		return 0;
	},

	/******************************************************/
	/* Specify whether TF2WH stats are displayed */
	PRICES_SHOW_TF2WH: function () {
		return true;
	},

	/* Specify whether Trade.tf stats are displayed */
	PRICES_SHOW_TRADETF: function () {
		return false;
	},

	/* Specify whether Backpack.tf stats are displayed */

	/******************************************************/
	/* Specify TF2WH update frequency (in minutes) */
	UPDATE_TF2WH_FREQUENCY: function () {
		return 15;
	},

	/* Specify Trade.tf update frequency (in minutes) */
	UPDATE_TRADETF_FREQUENCY: function () {
		return 15;
	},

	/******************************************************/
	/* Specify whether stats are displayed on Bazaar.tf */
	PRICES_SHOW_ON_BAZAAR: function () {
		return true;
	}

	/* Specify whether stats are displayed on TF2Outpost.com */
	/* Specify whether stats are displayed on Trade.tf */
	/* Specify whether stats are displayed on TF2WH.com */
	/* Specify whether stats are displayed on Backpack.tf */
}
