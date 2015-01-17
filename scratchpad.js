var ss = document.getElementById("pricelist").children[1];
var rows = ss.getElementsByTagName("tr");
var i, j;
var c_unique, c_vintage, c_genuine, c_strange, c_haunted, c_collector;
for (i=0; i<rows.length; i++) {

	// Get values
	var cols = rows[i].getElementsByTagName("td");
	var name = cols[0].innerText;

	// Check for "bonus when equipped"
	/* var bwe_idx = name.indexOf("\n");
	if (bwe_idx != -1) {
		name = name.slice(0, bwe_idx);
	}
	console.log(name);

	// Get values
	c_unique=c_part=c_uncraft=c_vintage=c_genuine=c_strange=c_haunted="";
	
	try { c_unique  = cols[1].children[0].innerText; } catch(e) {}
	try { c_part    = cols[1].children[2].innerText; } catch(e) {}
	try { c_uncraft = cols[2].children[0].innerText; } catch(e) {}
	try { c_vintage = cols[3].children[0].innerText; } catch(e) {}
	try { c_genuine = cols[4].children[0].innerText; } catch(e) {}
	try { c_strange = cols[5].children[0].innerText; } catch(e) {}
	try { c_haunted = cols[6].children[0].innerText; } catch(e) {}

	// Convert values to JSON
	var json = '{"n":"' + c_unique + '","p":"' + c_part + '","u":"' + c_uncraft + '","v":"' + c_vintage + '","g":"' + c_genuine + '","s":"' + c_strange + '","h":"' + c_haunted + '"}'; 
	console.log(json);

	// Log JSON in cache
	TFReconQuery.kvSet("trd_" + , json, ms) */
}
