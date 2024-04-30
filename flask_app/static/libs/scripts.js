function d3PieChart(){
    console.log("tarentino foot fetish")
    // Set up SVG dimensions and properties
    const margin = {top:20, right:20, bottom:20, left:20};
    const width = 350 - margin.left - margin.right,
    height = 350 - margin.top - margin.bottom,
    color = d3.scaleOrdinal(d3.schemeAccent); //color scheme
 
    // Selecting the div with id pieChart on the index.html template file
    const visualization = visualization = d3.select('#test')
    .append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")

    // Add a rectangle element with grey fill to create the background
    visualization.append("rect")
    .attr("width", width)  // Set the width to match the SVG
    .attr("height", height) // Set the height to match the SVG
    .attr("fill", "grey")   // Set the fill color to grey
}

async function sendAndReceiveData(json_payload) { // WORKS REALLY GOOD
  try {
    const data = json_payload; // JSON data object

    const response = await fetch("/send_data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json" // Indicate JSON data
      },
      body: data
      //body: JSON.stringify(data) // Stringify data as JSON
    });
    

    if (!response.ok) {
      throw new Error(`Error sending data: ${response.status}`);
    }

    const receivedData = await response.json()
    console.log("Data from Flask:", receivedData);
   return receivedData;
    
  } catch (error) {
    console.error("Error:", error);
  }
}