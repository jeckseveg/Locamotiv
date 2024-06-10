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

// change playback speed of surveillance video
function updatePlaybackSpeed(){
  var selectedSpeed = document.getElementById("playback_speed").value;
  console.log(selectedSpeed)
  for(var i = 0; i < videos.length; i++){
    videos[i].playbackRate = selectedSpeed
  }
  
}

// change button color on click
function bindClick(i) {
  return function() {
    // turn on/off
    if (buttons[i].style.backgroundColor!='rgb(85, 51, 51)'){
    buttons[i].style.backgroundColor = "#533"
    buttons[i].setAttribute('activated','False')
    videos[i].style.opacity = 0.5
    }
    // turn off/on
    else{
    buttons[i].style.backgroundColor = "#333"
    buttons[i].setAttribute('activated','True')
    videos[i].style.opacity = 1.0
    }
    frameUpdateEngine(0);
  };
}

async function updateSVG() {
  //console.log(svg)
  //console.log("^ svg")
  // process raw graph data for d3
  var nodeArray = Array.from(Object.values(graph_data.nodes));
  var nodeObject = graph_data.nodes
  var edgeArray = graph_data.edges
  var centroidArray = graph_data.centroids

  // padding to make graph behave
  // change this to be some sort of fraction of image size
  // need to see how this behaves
  var x_adjust = 137
  var y_adjust = 92          

  // clear svg
  svg.selectAll("circle").remove();
  svg.selectAll("path").remove();

  // only if ground points are being displayed
  if(ground_points_active){
    // scatter points for ground point nodes
    g.selectAll("dot")
      .data(nodeArray)
      .enter()
      .append("circle")
        .attr("cx", function (d) { return d.position[0]+x_adjust; } )
        .attr("cy", function (d) {return d.position[1]+y_adjust;} )
        .attr("r", 4)
        .attr("fill",function (d) { return d.color; } )
        .style('opacity', opacity);

    // paths for edges
    var link = d3.linkHorizontal()
          .source(function(d) {
            //console.log("line");
            //console.log(nodeObject[d[0]]['position']);
            //console.log([nodeObject[d[0]]['position'][0]+x_adjust, nodeObject[d[0]]['position'][1]+y_adjust])
              return [nodeObject[d[0]]['position'][0]+x_adjust, nodeObject[d[0]]['position'][1]+y_adjust];
          })
          .target(function(d) {
            //console.log(d)
            //console.log([nodeObject[d[1]]['position'][0]+x_adjust, nodeObject[d[1]]['position'][1]+y_adjust])
              return [nodeObject[d[1]]['position'][0]+x_adjust, nodeObject[d[1]]['position'][1]+y_adjust];
          });
    d3.select("#svg-id") 
      .selectAll("path")
      .data(edgeArray)
      .join("path")
      .attr("stroke-width", 5)
      .attr("d", link)
      .style("opacity",opacity)
      //.classed("link", true);
  }

  if (centroids_active){
    // code to draw the centroids here
    // code to draw the centroids here
    g.selectAll("centroid")
      .data(centroidArray)
      .enter()
      .append("circle")
        .attr("cx", function (d) { return d[0]+x_adjust; } )
        .attr("cy", function (d) {return d[1]+y_adjust;} )
        .attr("r", 7)
        .attr("fill","white")
        .style("stroke", "black")  // Add stroke for outline
        .style("stroke-width", 2)  // Adjust stroke width as needed
        .style('opacity', 1);
  }
};

// aync function to perform updates every frame
async function frameUpdateEngine(timestamp) {
  const startTime = performance.now();
  var min_points = parseInt(document.getElementById("centroid-slider").value)
  currentFrame = Math.floor(fps*video_1.currentTime) // store current frame for operations
  //if(currentFrame%5 === 0){
    // create payload for flask
    var new_buttons = document.querySelectorAll('.button-container button');
    var activatedValues = Array.from(new_buttons).map(button => button.getAttribute("activated"));
    
    var json_payload = JSON.stringify({
      max_distance : max_dist,
      frame_number: currentFrame,
      activated_cameras: activatedValues,
      location: "chase_1",
      min_points: min_points
    });

    // print frame number
    console.log(`Current Frame: ${currentFrame}`);
    console.log(json_payload)

    // send payload
    graph_data = await sendAndReceiveData(json_payload)
    console.log("graph data")
    console.log(graph_data)
    
    updateSVG() // update the svg
  //}
  // cleanse the video frame callback
  //video_1.cancelVideoFrameCallback(frameUpdateEngine);
  video_1.requestVideoFrameCallback(frameUpdateEngine);
  const endTime = performance.now();
  console.log("Execution time:", endTime - startTime, "milliseconds");
};

function reload_videos(box_toggler_active) {
  for (let i = 1; i <= 8; i++){
    var video_i = document.getElementById(`video_${i}`);
    var currentTime = video_i.currentTime;
    var src_i = document.getElementById(`source_${i}`);
    var src_path = src_i.src;
    if(box_toggler_active){ // turn on boxes
      src_path = src_path.slice(0, src_path.lastIndexOf(".")) + "_boxes_2.mp4";
    }
    else{ // turn off boxes
      src_path = src_path.slice(0,src_path.indexOf("_boxes_2"))+".mp4"; 
    }

    src_i.src = src_path;
    video_i.load();
    video_i.currentTime = currentTime;
    };
    updateSVG();
  }

function toggle_boxes() {
  // turn off
  var box_toggler = document.getElementById("toggle-boxes")
  console.log(box_toggler.getAttribute("activated")==="True")
  if (box_toggler.getAttribute("activated")==="True"){
    box_toggler_active = false;
    box_toggler.setAttribute('activated','False');
    box_toggler.style.backgroundColor = "#533";
    
    reload_videos(box_toggler_active);
  }
  // turn on
  else{
    box_toggler_active = true;
    box_toggler.setAttribute('activated','True');
    box_toggler.style.backgroundColor = "#333";
    
    reload_videos(box_toggler_active);
  }
  updateSVG();
}

// toggle ground points on svg graph
function toggle_ground_points() {
  // turn on/off
  var ground_points_button = document.getElementById("toggle-ground-points");
  console.log(ground_points_button.getAttribute("activated")==="True")
  if (ground_points_button.getAttribute("activated")==="True"){
    ground_points_button.style.backgroundColor = "#533"
    ground_points_button.setAttribute('activated','False')
    ground_points_active = false
  }
  // turn off/on
  else{
    ground_points_button.style.backgroundColor = "#333"
    ground_points_button.setAttribute('activated','True')
    ground_points_active = true
  }
  updateSVG();
}

// toggle centroids on svg graph
function toggle_centroids() {
  // turn on/off
  var centroid_button = document.getElementById("toggle-centroids");
  console.log(centroid_button.getAttribute("activated")==="True")
  if (centroid_button.getAttribute("activated")==="True"){
    centroid_button.style.backgroundColor = "#533";
    centroid_button.setAttribute('activated','False');
    centroid_button.style.opacity = 1.0;
    centroids_active = false;
  }
  // turn off/on
  else{
    centroid_button.style.backgroundColor = "#333";
    centroid_button.setAttribute('activated','True');
    centroid_button.style.opacity = 1.0;
    centroids_active = true;
  }
  updateSVG();
}

function updateTimeDisplay() {
  const currentTime = video_1.currentTime;
  const totalDuration = video_1.duration;
  const formattedTime = formatTime(currentTime, totalDuration);  // Implement formatTime function
  time_display.textContent = formattedTime;
}

function formatTime(currentTime, totalDuration) {
  // Convert seconds to integer values for minutes and seconds
  const currentMinutes = Math.floor(currentTime / 60);
  const currentSeconds = Math.floor(currentTime % 60);

  // Convert seconds to integer values for total minutes and seconds
  const totalMinutes = Math.floor(totalDuration / 60);
  const totalSeconds = Math.floor(totalDuration % 60);

  // Format minutes and seconds with zero-padding using String.padStart()
  const formattedCurrentMinutes = String(currentMinutes).padStart(2, "0");
  const formattedCurrentSeconds = String(currentSeconds).padStart(2, "0");
  const formattedTotalMinutes = String(totalMinutes).padStart(2, "0");
  const formattedTotalSeconds = String(totalSeconds).padStart(2, "0");

  // Return the formatted time string
  return `${formattedCurrentMinutes}:${formattedCurrentSeconds} / ${formattedTotalMinutes}:${formattedTotalSeconds}`;
}