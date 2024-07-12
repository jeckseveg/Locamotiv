const { default: cluster } = require('cluster');
const networkx = require('./jsnetworkx.js');

const fs = require('fs');
const groundPointsPath = '../data/chase_1/ground_points.json';

var G = new networkx.Graph();

// lookup dict for mapping camera id to color
const cameraColors = {
    0: 'red',
    1: '#00CC66',
    2: '#3399FF',
    3: 'orange',
    4: '#CC33CC',
    5: 'yellow',
    6: 'white',
    7: '#ff9999'
  };

// load ground points json
var groundPoints;
fs.readFile(groundPointsPath, 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    groundPoints = JSON.parse(data);
    
    // Getting a sample frame to test functions
    for (let frameIndex = 0; frameIndex < groundPoints.length; frameIndex++) {
        var frame = groundPoints[frameIndex];
        if (frameIndex === 200){break;}
    }

    let maxDistance = 40;
    let clusters = [];
    let clusterCameras = [];

    G = createGraph(G, frame, maxDistance); // create base graph with initial connections
    G = createClusters(G, clusters, clusterCameras); // create clustered graph

    console.log("clusters: "), console.log(clusters);
    console.log("cameras: "), console.log(clusterCameras);
    //console.log(findIntersection(clusterCameras[0],clusterCameras[4]))
    //console.log(checkClusters(clusters, clusterCameras, 0,9))
    //console.log(G.nodes(true));
    //console.log(G.edges());
    //console.log(G.node.get(0));
    
    //console.log(G.edge.get(0).get(12)['weight']) // reference a connection between two nodes and get weight
    //console.log(G)
});


// IMPORTANT FUNCTIONS // IMPORTANT FUNCTIONS // IMPORTANT FUNCTIONS // IMPORTANT FUNCTIONS 

// create initial graph with all elements within distance connected
function createGraph(G, frame, maxDistance) {
    let pointIndex = 0;
    frame.forEach((camera, cameraIndex) => { // iterate through each cameras data
        camera.forEach((groundPoint) => { // iterate through each ground point in the camera
            G.addNode(pointIndex, { camera: cameraIndex, position: groundPoint });
            pointIndex++;
        });
    });
    G = createEdges(G, frame, maxDistance); // create edges between all points within maxDistance
    return G;
}

// indiscriminately create initial edges between nodes within max distance 
function createEdges(G, frame, maxDistance) {
    for (let node1 of G.nodes()) { // iterate over all nodes in the graph
        for (let node2 of G.nodes()) { // compare each node with every other node
            if (node1 !== node2 && differentCamera(node1, node2)) {
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
function createClusters(G, clusters, clusterCameras) {
    let sortedEdges = sortEdges(G);  // list of 
    //console.log(sortedEdges);
    sortedEdges.forEach(edge => {
        let node1 = edge[0];
        let node2 = edge[1];
        let weight = edge[2].weight;

        // if both nodes unmatched then create new cluster
        if (G.node.get(node1)['cluster'] === undefined && G.node.get(node2)['cluster'] === undefined) {
            if (G.node.get(node1)['camera'] !== G.node.get(node2)['camera']) { // only initialize if different colors
                initializeCluster(clusters, clusterCameras, node1, node2)
            }
        }

        // if both nodes are clustered then check if valid merge
        if (G.node.get(node1)['cluster'] !== undefined && G.node.get(node2)['cluster'] !== undefined) {
            if (checkClusters(clusters, clusterCameras, node1, node2)){ // check color validity
                console.log("valid merge");
            }
        }

        // if one or more nodes is clustered then check if valid merge
        if (G.node.get(node1)['cluster'] !== undefined) {
            initializeSoloCluster(node1);
            if (checkClusters(clusters, clusterCameras, node1, node2)){ // check color validity
                console.log("valid merge");
            }
        }
        if (G.node.get(node2)['cluster'] !== undefined) {
            initializeSoloCluster(node2);
            if (checkClusters(clusters, clusterCameras, node1, node2)){ // check color validity
                console.log("valid merge");
            }
        }


    });

    return G;
}


// SUPPORTING FUNCTIONS // SUPPORTING FUNCTIONS // SUPPORTING FUNCTIONS // SUPPORTING FUNCTIONS

// create new clusters for current nodes with no existing cluster assignments
function initializeCluster(clusters, clusterCameras, node1, node2) {
    let clusterId = clusters.length;
    clusters[clusterId] = [node1, node2];
    clusterCameras[clusterId] = [G.node.get(node1)['camera'], G.node.get(node2)['camera']];
    G.node.get(node1)['cluster'] = clusterId;
    G.node.get(node2)['cluster'] = clusterId;
}

// create new cluster for single node
function initializeSoloCluster(clusters, clusterCameras, node){
    let clusterId = clusters.length;
    clusters[clusterId] = [node];
    clusterCameras[clusterId] = [G.node.get(node)['camera']];
    G.node.get(node)['cluster'] = clusterId;
}

// check to make sure two clusters meet criteria for merging
// no nodes of same color
function checkClusters(clusters, clusterCameras, node1, node2){
    let intersection = findIntersection(clusterCameras[G.node.get(node1)['cluster']],
                                        clusterCameras[G.node.get(node1)['cluster']]);
    if (intersection.length<1){
        return true;
    }
    else{
        return false;
    }
}

// reassign all old cluster nodes and cameras into the new clusters bin
function mergeClusters(clusters, clusterCameras, oldClusterNode, newClusterNode){
    // new / old cluster ids for readiblity
    oldClusterId = G.node.get(oldClusterNode)['cluster'];
    newClusterId = G.node.get(newClusterNode)['cluster'];
    oldClusterNodes = clusters[oldClusterId];

    // change all nodes properties to reflect new cluster
    oldClusterNodes.forEach(nodeId => {
        G.node.get(nodeId)['cluster'] = newClusterId;
    });

    // reassign nodes + colors
    clusters[newClusterId] = clusters[newClusterId].concat(clusters[oldClusterId]) // move nodes from old cluster to new cluster
    clusterCameras[newClusterId] = clusterCameras[newClusterId].concat(clusterCameras[oldClusterId]) // move colors from old cluster to new cluster

    // delete old cluster
    clusters[oldClusterId] = undefined;
    clusterCameras[oldClusterId] = undefined;
}




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
function differentCamera(node1, node2) {
    return G.node.get(node1)['camera'] !== G.node.get(node2)['camera'];
}

// returns array with intersecting elements
function findIntersection(arr1, arr2) {
    return arr1.filter(element => arr2.includes(element));
}

// square euclidean distance between two points
function euclideanDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}