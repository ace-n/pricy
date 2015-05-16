var saveChanges = function() {
	$(".notif").show();
	store.kvSave();
}

var callback = function () {

	/* Hide no-JS and change notifiers */
	$("#noJS").hide();
	$(".notif").hide();

	/* Checkbox initializers */
	$(".checkbox").each(function () {
		var t = $(this);
		var c = store.kvGet(t.attr("name"));
		if (c != null) {
			if (c !== 1) {
				t.addClass("fa-square-o");
				t.removeClass("fa-check-square-o");
			} else {
				t.addClass("fa-check-square-o");
				t.removeClass("fa-square-o");
			}
		}
	});

	/* Checkbox listeners */
	$(".checkbox").click(function () {

		// Toggle checked state
		var t = $(this);
		var val = 0;
		if (t.hasClass("fa-square-o")) {
			t.removeClass("fa-square-o");
			t.addClass("fa-check-square-o");
			val = 1;
		} else {
			t.addClass("fa-square-o");
			t.removeClass("fa-check-square-o")
		}

		// Save appropriate property
		store.kvSet(t.attr("name"), val);
		saveChanges();
	});

	/* Radio-button initializers */
	$(".radio").each(function () {
		var t = $(this);
		var c = store.kvGet(t.attr("name"));
		if (c == t.attr("value")) {
			t.removeClass("fa-circle-o");
			t.addClass("fa-dot-circle-o");
		} else if (c) {
			t.addClass("fa-circle-o");
			t.removeClass("fa-dot-circle-o");
		}
	});

	/* Radio-button listeners */
	$(".radio").click(function () {

		var t = $(this);

		// Uncheck all buttons in group
		var name = t.attr("name");
		$(".radio[name=" + name + "]").removeClass("fa-dot-circle-o").addClass("fa-circle-o");

		// Check mentioned one
		t.removeClass("fa-circle-o").addClass("fa-dot-circle-o");

		// Record value
		store.kvSet(name, t.attr("value"));
		saveChanges();
	});

	/* Num-box helper function */
	var numboxBoundUpdate = function(t, tbx) {

		// Vars
		var idx = parseInt(tbx.attr("idx"), 10);
		var minIdx = tbx.attr("minidx");
		var maxIdx = Options.PERIODS.length - 1;
		var txt = t.text();

		// Bounds check
		if ((idx == minIdx && txt == "-") || (idx == maxIdx && txt == "+")) {
			t.addClass("disabled");
		} else {
			t.removeClass("disabled");
		}
	};

	/* Num-box initializers */
	$("[minidx]").each(function () {

		// Initialize attrs
		var t = $(this);
		var tbx = $("#" + t.attr("linkid"));
		var idx = store.kvGet(t.attr("name"));
		if (!idx)
			idx = t.attr("minidx");
		t.attr("value", Options.PERIOD_LABELS[idx]);
		t.attr("idx", idx);
	});
	$(".numbox-btn").each(function () {

		// Tooltips
		var t = $(this);
		t.attr("title", t.text() === "-" ? "Faster" : "Slower");

		// Bound indicators
		var tbx = $("#" + t.attr("linkid"));
		numboxBoundUpdate(t, tbx);
	});

	/* Num-box listeners */
	$(".numbox-btn").click(function () {

		// Get data
		var t = $(this);
		var tbx = $("#" + t.attr("linkid"));
		var idx = parseInt(tbx.attr("idx"), 10);

		// Modify idx/value
		if (t.text() === "+") {
			idx = Math.min(idx + 1, Options.PERIODS.length - 1);
		} else {
			idx = Math.max(idx - 1, tbx.attr("minidx"));
		}
		tbx.attr("idx", idx);
		tbx.attr("value", Options.PERIOD_LABELS[idx]);

		// Update bound indicators
		numboxBoundUpdate(t, tbx);
		numboxBoundUpdate($(t.siblings(".numbox-btn")[0]), tbx);

		// Update stored properties
		store.kvSet(tbx.attr("name"), idx);
		saveChanges();
	});

	/* Disable double click highlighting */
	$(".checkbox").on("selectstart", false);
	$(".radio").on("selectstart", false);
	$(".numbox").on("selectstart", false);
}

/* Initialize kvStore instance */
var store = new kvStore("pricyOptions", callback, true);
