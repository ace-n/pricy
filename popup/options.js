// DEBUG
var clog = function(s) {
	chrome.extension.getBackgroundPage().console.log(s)
}

var callback = function () {

	/* Remove no-JS notifier */
	var noJS = document.getElementById("noJS");
	noJS.style.display = 'none';

	/* Checkbox initializers */
	$(".checkbox").each(function () {
		var t = $(this);
		var c = store.kvGet(t.attr("name"));
		if (c != null && c !== 1) {
			t.addClass("fa-square-o");
			t.removeClass("fa-check-square-o");
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
		store.kvSave();
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
		clog(name);
		store.kvSave();
	});

	/* Num-box helper function */
	var numboxBoundUpdate = function(t, tbx, idx) {
		tbx.parent().children("span").removeClass("disabled");
		if (idx === Options.FREQUENCIES.length - 1 || idx === parseInt(tbx.attr("minidx"),10)) {
			t.addClass("disabled");
		}
	};

	/* Num-box initializers */
	$("[minidx]").each(function () {

		// Initialize attrs
		var t = $(this);
		var tbx = $("#" + t.attr("linkid"));
		var idx = t.attr("minidx");
		t.attr("value", Options.FREQUENCIES[idx]);
		t.attr("idx", idx);

		// Update bound indicators
		numboxBoundUpdate(t, tbx, idx);
	});
	$(".numbox-btn").each(function () {
		var t = $(this);
		t.attr("title", t.text() === "+" ? "Faster" : "Slower");
	});

	/* Num-box listeners */
	$(".numbox-btn").click(function () {

		// Get data
		var t = $(this);
		var tbx = $("#" + t.attr("linkid"));
		var idx = parseInt(tbx.attr("idx"), 10);

		// Modify idx/value
		if (t.text() === "+") {
			idx = Math.min(idx + 1, Options.FREQUENCIES.length - 1);
		} else {
			idx = Math.max(idx - 1, tbx.attr("minidx"));
		}
		tbx.attr("idx", idx);
		tbx.attr("value", Options.FREQUENCIES[idx]);

		// Update bound indicators
		numboxBoundUpdate(t, tbx, idx);

		// Update stored properties
		store.kvSet(tbx.attr("id"), Options.PERIODS[idx]);
		store.kvSave();
	});

	/* Disable double click highlighting */
	$(".checkbox").on("selectstart", false);
	$(".radio").on("selectstart", false);
	$(".numbox").on("selectstart", false);
}

/* Initialize kvStore instance */
var store = new kvStore("pricyOptions", callback, true);
