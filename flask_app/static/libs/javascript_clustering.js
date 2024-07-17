
// IMPORTANT FUNCTIONS // IMPORTANT FUNCTIONS // IMPORTANT FUNCTIONS // IMPORTANT FUNCTIONS 
function clusterFrame(groundPoints, frameIndex, maxDistance, minPoints, activatedValues, verbose = false){
    console.log("forming clusters...")
    let G = new jsnx.Graph();
    let frameGroundPoints = groundPoints[frameIndex];
    let clusters = [];
    let clusterCameras = [];
    let activeCameras = processActivatedValues(activatedValues);
    console.log(activatedValues);
    // create graph with initial edges and cluster nodes
    G = createGraph(G, frameGroundPoints, maxDistance, activeCameras); // create base graph with initial connections
    G = createClusters(G, clusters, clusterCameras, verbose=false); // create clustered graph

    // create centroids for nodes without edges
    G = initializeStragglerClusters(G, clusters, clusterCameras)
   
    // remove blank clusters from arrays and prune unclustered edges
    clusters = clusters.filter(element => element !== undefined);
    clusterCameras = clusterCameras.filter(element => element !== undefined);
    G = pruneEdges(G);

    var nodes = G.nodes(true);
    var centroids = computeCentroids(clusters, G, minPoints);
    var edges = G.edges();
    var nodeObject = {};

    // reformat nodes from [id,nodeData] => {id:nodeData}
    nodes.forEach((node)=>{
        nodeObject[node[0]] = node[1]
    })
    
    if (verbose) {console.log(clusteredPoints);}
    let clusteredPoints = {
        'centroids':centroids,
        'edges':edges,
        'nodes':nodeObject
    }
    
    return clusteredPoints;
}


// create initial graph with all elements within distance connected
function createGraph(G, frame, maxDistance, activeCameras) {
    let pointIndex = 0;
    frame.forEach((camera, cameraIndex) => { // iterate through each cameras data
        if (activeCameras[cameraIndex]) {
            camera.forEach((groundPoint) => { // iterate through each ground point in the camera
                G.addNode(pointIndex, { camera: cameraIndex, position: groundPoint });
                pointIndex++;
            });
    }
    });
    G = createEdges(G, frame, maxDistance); // create edges between all points within maxDistance
    return G;
}

// indiscriminately create initial edges between nodes within max distance 
function createEdges(G, frame, maxDistance) {
    for (let node1 of G.nodes()) { // iterate over all nodes in the graph
        for (let node2 of G.nodes()) { // compare each node with every other node
            if (node1 !== node2 && differentCamera(node1, node2, G)) {
                let distance = euclideanDistance(G.node.get(node1)['position'], G.node.get(node2)['position']);
                if (distance < maxDistance) { // add an edge if the nodes are within the distance threshold
                    G.addEdge(node1, node2, {'weight': distance}); // add the edge with the calculated distance as weight
                }
            }
        }
    }
    return G; // return the graph with the new edges
}

// wrapper function that takes in graph G and returns clustered graph
function createClusters(G, clusters, clusterCameras, verbose=false) {

    let sortedEdges = sortEdges(G);  // list of 
    //sortedEdges.forEach(edge => {console.log(edge)});
    sortedEdges.forEach(edge => {
        // console.log(sortedEdges);
        let node1 = edge[0];
        let node2 = edge[1];
        let weight = edge[2].weight;

        // if both nodes are clustered then check if valid merge
        if (G.node.get(node1)['cluster'] !== undefined && G.node.get(node2)['cluster'] !== undefined) {
            if (G.node.get(node1)['cluster'] === G.node.get(node2)['cluster']){
            }
            else if (checkClusters(clusters, clusterCameras, node1, node2, G)){ // check color validity
                mergeClusters(clusters, clusterCameras, node1, node2, G);
                if (verbose){
                    console.log("valid merge");
                    console.log(clusterCameras[G.node.get(node1)['cluster']]),console.log(clusterCameras[G.node.get(node2)['cluster']]);
                    
                }
            }
            else{
                if (verbose){
                console.log("invalid merge");
                console.log(clusterCameras[G.node.get(node1)['cluster']]),console.log(clusterCameras[G.node.get(node2)['cluster']]);
                }
            }
        } 

        // if one or more nodes is clustered then check if valid merge
        if (G.node.get(node1)['cluster'] !== undefined && G.node.get(node2)['cluster'] === undefined) {
            initializeSoloCluster(clusters, clusterCameras, node2, G);
            if (checkClusters(clusters, clusterCameras, node1, node2, G)){ // check color validity
                mergeClusters(clusters, clusterCameras, node2, node1, G);
                if (verbose){
                    console.log("valid merge");
                    console.log(clusterCameras[G.node.get(node1)['cluster']]),console.log(clusterCameras[G.node.get(node2)['cluster']])
                    }
            }
            else {
                if (verbose){
                    console.log("invalid merge");
                    console.log(clusterCameras[G.node.get(node1)['cluster']]),console.log(clusterCameras[G.node.get(node2)['cluster']]);
                    }
            }
        }
        if (G.node.get(node1)['cluster'] === undefined && G.node.get(node2)['cluster'] !== undefined) {
            initializeSoloCluster(clusters, clusterCameras, node1, G);
            if (checkClusters(clusters, clusterCameras, node1, node2, G)){ // check color validity
                mergeClusters(clusters, clusterCameras, node1, node2, G);
                if (verbose){
                    console.log("valid merge");
                    console.log(clusterCameras[G.node.get(node1)['cluster']]),console.log(clusterCameras[G.node.get(node2)['cluster']]);
                    }
            }
            else {
                if (verbose){
                    console.log("invalid merge");
                    console.log(clusterCameras[G.node.get(node1)['cluster']]),console.log(clusterCameras[G.node.get(node2)['cluster']]);
                    }
            }
        }

        // if both nodes unmatched then create new cluster
        if (G.node.get(node1)['cluster'] === undefined && G.node.get(node2)['cluster'] === undefined) {
            if (G.node.get(node1)['camera'] !== G.node.get(node2)['camera']) { // only initialize if different colors
                if (verbose){console.log("initialize cluster");}
                initializeCluster(clusters, clusterCameras, node1, node2, G);
            }
        }
    });

    return G;
}


// SUPPORTING FUNCTIONS // SUPPORTING FUNCTIONS // SUPPORTING FUNCTIONS // SUPPORTING FUNCTIONS

// create new clusters for current nodes with no existing cluster assignments
function initializeCluster(clusters, clusterCameras, node1, node2, G) {
    let clusterId = clusters.length;
    clusters[clusterId] = [node1, node2];
    clusterCameras[clusterId] = [G.node.get(node1)['camera'], G.node.get(node2)['camera']];
    G.node.get(node1)['cluster'] = clusterId;
    G.node.get(node2)['cluster'] = clusterId;
}

// create new cluster for single node
function initializeSoloCluster(clusters, clusterCameras, node1, G){
    let clusterId = clusters.length;
    clusters[clusterId] = [node1];
    clusterCameras[clusterId] = [G.node.get(node1)['camera']];
    G.node.get(node1)['cluster'] = clusterId;
}

// check to make sure two clusters meet criteria for merging
// no nodes of same color
function checkClusters(clusters, clusterCameras, node1, node2, G, verbose=false){
    if (verbose){
        console.log("check clusters");
        console.log(G.node.get(node1));
        console.log(G.node.get(node2));
    }
    let intersection = findIntersection(clusterCameras[G.node.get(node1)['cluster']],
                                        clusterCameras[G.node.get(node2)['cluster']]);
    if (intersection.length<1){return true;}
    else{return false;}
}

// reassign all old cluster nodes and cameras into the new clusters bin
function mergeClusters(clusters, clusterCameras, oldClusterNode, newClusterNode, G){
    // new / old cluster ids for readiblity
    oldClusterId = G.node.get(oldClusterNode)['cluster'];
    newClusterId = G.node.get(newClusterNode)['cluster'];
    oldClusterNodes = clusters[oldClusterId];

    // change all nodes properties to reflect new cluster
    oldClusterNodes.forEach(nodeId => {
        G.node.get(nodeId)['cluster'] = newClusterId;
    });

    // reassign nodes + colors
    clusters[newClusterId] = clusters[newClusterId].concat(clusters[oldClusterId]); // move nodes from old cluster to new cluster
    clusterCameras[newClusterId] = clusterCameras[newClusterId].concat(clusterCameras[oldClusterId]); // move colors from old cluster to new cluster

    // delete old cluster
    clusters[oldClusterId] = undefined;
    clusterCameras[oldClusterId] = undefined;
}


function computeCentroids(clusters, G, minPoints, verbose=false){
    centroids = [];
    clusters.forEach((cluster)=>{
        if (cluster.length>=minPoints){
        let xPositions = 0;
        let yPositions = 0;
        if(verbose){console.log(cluster);}
        cluster.forEach((node)=>{
            xPositions += G.node.get(node)['position'][0];
            yPositions += G.node.get(node)['position'][1];
        });
        centroids.push([xPositions/cluster.length,yPositions/cluster.length])};
    });
    if(verbose){console.log(centroids);}
    return centroids;
}

function pruneEdges(G){
    G.edges().forEach(edge => {
        if (differentCluster(edge[0],edge[1],G)){
            G.removeEdge(edge[0], edge[1])
        }
    });
    return G;
}

function initializeStragglerClusters(G, clusters, clusterCameras){
    var nodes = G.nodes(true);
    nodes.forEach((node)=>{
        if (node[1]['cluster'] === undefined) {
            initializeSoloCluster(clusters, clusterCameras, node[0], G);
        };
    });
    return G;
}

// SUPPORTING FUNCTIONS

// return edges sorted by weight ascending
function sortEdges(G) { 
    let edges = Array.from(G.edges(true)); // get all edges with data
    edges.sort((a, b) => a[2].weight - b[2].weight); // sort edges by weight in ascending order

    let sortedEdges = [];
    edges.forEach(edge => {
        sortedEdges.push([edge[0], edge[1], edge[2]]);
    });

    return sortedEdges;
}

// check if two node id's are from different cameras
function differentCamera(node1, node2, G) {
    return G.node.get(node1)['camera'] !== G.node.get(node2)['camera'];
}

function differentCluster(node1, node2, G) {
    return G.node.get(node1)['cluster'] !== G.node.get(node2)['cluster'];
}

// returns array with intersecting elements
function findIntersection(arr1, arr2) {
    return arr1.filter(element => arr2.includes(element));
}

// square euclidean distance between two points
function euclideanDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}
// convert ['true','true','false'] => [true,true,false]
function processActivatedValues(strArray){
    boolArray = [];
    strArray.forEach((string)=>{
        if (string === "true") {boolArray.push(true);}
        else {boolArray.push(false);}
    })
    return boolArray;
}

var module;

if (module === undefined) {

}
else {
    module.exports = {
        euclideanDistance,
        findIntersection,
        differentCluster,
        differentCamera,
        sortEdges,
        initializeStragglerClusters,
        pruneEdges,
        computeCentroids,
        mergeClusters,
        checkClusters,
        initializeSoloCluster,
        initializeCluster,
        createClusters,
        createEdges,
        createGraph,
  }
};