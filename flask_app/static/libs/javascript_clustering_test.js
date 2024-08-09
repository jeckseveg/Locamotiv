const { default: cluster } = require('cluster');
const networkx = require('./jsnetworkx.js');
const javascript_clustering = require('./javascript_clustering.js');
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
var frameDataObjects = {}

fs.readFile(groundPointsPath, 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    groundPoints = JSON.parse(data);
    
    // Getting a sample frame to test functions
    for (let frameIndex = 0; frameIndex < groundPoints.length; frameIndex++) {
        var frame = groundPoints[frameIndex];
        var maxDistance = 40;
        var clusters = [];
        var clusterCameras = [];
        var activeCameras = [true,true,true,true,true,true,true,true]

        // create graph with initial edges and cluster nodes
        G = javascript_clustering.createGraph(G, frame, maxDistance, activeCameras); // create base graph with initial connections
        G = javascript_clustering.createClusters(G, clusters, clusterCameras, verbose=false); // create clustered graph

        // create centroids for nodes without edges
        G = javascript_clustering.initializeStragglerClusters(G, clusters, clusterCameras)
    
        // remove blank clusters from arrays and prune unclustered edges
        clusters = clusters.filter(element => element !== undefined);
        clusterCameras = clusterCameras.filter(element => element !== undefined);
        G = javascript_clustering.pruneEdges(G);

        var nodes = G.nodes(true);
        var centroids = javascript_clustering.computeCentroids(clusters,G,verbose);
        var edges = G.edges();
        var nodeObject = {};

        // reformat nodes from [id,nodeData] => {id:nodeData}
        nodes.forEach((node)=>{
            nodeObject[node[0]] = node[1]
        })
        console.log(G.edges().length)
        frameObject = {
            'centroids':centroids,
            'edges':edges,
            'nodes':nodeObject
        }

        console.log(centroids)
        if (frameIndex === 10){break;}
    }

   
});