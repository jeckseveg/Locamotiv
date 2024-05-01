import os
import numpy as np
import networkx as nx


def create_graph(frame_transformed_points, threshold):
    G = nx.Graph()
    colors = {0:'red',1:'#00CC66',2:'#3399FF',3:'orange',4:'#CC33CC',5:'yellow',6:'white',7:'#ff9999'}
    position_dict = {}
    # Iterate through ground points for each camera
    node_id=0
    for camera_id, ground_points in enumerate(frame_transformed_points):
        for i, p1 in enumerate(ground_points): 
            if p1[0]>0 and p1[1]>0:           
                G.add_node(node_id, camera=camera_id,position=list(p1),color=colors[camera_id],visited=False)
                position_dict[node_id] = p1
                node_id+=1

    for node_id in G.nodes:
        for search_node_id in G.nodes:
            if node_id!=search_node_id:
                node_1 = G.nodes[node_id]
                node_2 = G.nodes[search_node_id]
                distance = np.linalg.norm(np.array(node_1['position']) - np.array(node_2['position']))
                if distance < threshold and node_1['camera'] != node_2['camera']:
                    G.add_edge(node_id,search_node_id,weight=distance,visited=False)

    communities= hierarchical_clustering_color_dynamic(G.copy())
    communities = process_communities(communities)
    print(communities)
    G = create_clustered_graph(communities, G)
    return G, position_dict

def consolidate_projections(G):
    """Prune connections to group camera points"""
    sorted_edges = sorted(G.edges(), key=lambda edge: G.edges[edge[0], edge[1]]['weight'])

    for edge in sorted_edges:
        if edge in G.edges:
            # set edge as visited
            G.edges[edge]['visited'] = True

            # variables
            u = G.nodes[edge[0]] # u
            v = G.nodes[edge[1]] # v
            u_id = edge[0]
            v_id = edge[1]
            u_color = u['color']
            v_color = v['color']
            
            #print(f"going through edges for u node {u_id}")
            u_neighbors = G.edges(u_id)
            #print(f"u neighbors: {u_neighbors}")
            for neighbor in list(u_neighbors).copy(): # go through u neighboring nodes and remove connections to same color as v
                if G.edges[neighbor]['visited']==False and neighbor in G.edges:
                    w_id = neighbor[1]
                    w = G.nodes[neighbor[1]]
                    if v_color == w['color']:
                        G.remove_edge(*neighbor)
                else:
                    #print('visited')
                    pass
            

            #print(f"going through edges for v node {v_id}")
            v_neighbors = G.edges(v_id)
            #print(f"v neighbors: {v_neighbors}")
            for neighbor in list(v_neighbors).copy(): # go through v neighboring nodes and remove connections to same color as u
                if G.edges[neighbor]['visited']==False and neighbor in G.edges:
                    w_id = neighbor[1]
                    w = G.nodes[neighbor[1]]
                    if u_color == w['color']:
                        G.remove_edge(*neighbor)
                else:
                    #print('visited')
                    pass
    return G


def process_cameras(string_cameras):
    activated_cameras = []
    for camera in string_cameras:
        if camera == "True":
            activated_cameras.append(True)
        else:
            activated_cameras.append(False)
    return activated_cameras


def compute_centroids(G,min_points): 
    '''
    Takes graph as argument and returns the midpoints of all connected components'''  
    connected_components = list(nx.connected_components(G))
    print(connected_components)
    centroids = []
    for group in connected_components:
        if len(group)>=min_points:
            group = list(group)
            positions = np.array([G.nodes[node]['position'] for node in group])
            centroid = list(np.mean(positions,axis=0))
            centroids.append(centroid)
    
    # handle single dingles if necessary
    if min_points==1:
        for node in G.adjacency():
            if len(node[1])==0:
                print(G.nodes[node[0]])
                centroids.append(G.nodes[node[0]]['position'])

    return centroids


def hierarchical_clustering_color_dynamic(G):
  """
  Performs hierarchical clustering on a graph with color constraint
  ensuring no cluster has the same color twice.

  Args:
      G: A NetworkX graph object.

  Returns:
      A dictionary mapping nodes to their assigned cluster IDs.
  """
  clusters = {node: node for node in G.nodes}  # Initialize each node as its own cluster
  finished = False

  while not finished:
    finished = True
    min_edge = None

    sorted_edges = sorted(G.edges(), key=lambda edge: G.edges[edge[0], edge[1]]['weight'])
    # Find closest edge where nodes have different colors
    for edge in sorted_edges:
      u, v = edge  # Unpack the edge tuple
      
      if (clusters[u] != clusters[v]):  # Check for different clusters
        # Get all nodes in the cluster of node u
        cluster_nodes = [n for n in clusters if clusters[n] == clusters[u]]

        # Check if adding v to cluster of u wouldn't violate color constraint
        if all(G.nodes[v]["color"] != G.nodes[c]["color"] for c in cluster_nodes):
          min_edge = (u, v)

    # Merge closest valid nodes if found
    if min_edge:
      finished = False
      merge_cluster(clusters, min_edge[0], min_edge[1])
      G.remove_edge(*min_edge)  # Remove processed edge

  return clusters,G


# get clusters from HCCD algorithm
def process_communities(communities):
    unique_communities = set()
    clusters = []
    temp_dict = {}

    for key in communities[0]:
        community = communities[0][key]
        if community not in unique_communities:
            unique_communities.add(community)
            temp_dict[community] = len(unique_communities)
            clusters.append([])
        clusters[temp_dict[community]-1].append(key)
    return clusters


def create_clustered_graph(cluster_list, G):
  """
  Removes all edges from a graph and creates edges for fully connected clusters.

  Args:
      cluster_list: A list of lists, where each sublist represents a cluster (node IDs).
      G: A NetworkX graph object.

  Returns:
      A modified NetworkX graph object with fully connected clusters.
  """
  # Remove all existing edges
  G.clear_edges()

  # Add edges for each node within a cluster to all other nodes in the same cluster
  for cluster in cluster_list:
    for i in range(len(cluster)):
      for j in range(i + 1, len(cluster)):
        node1 = cluster[i]
        node2 = cluster[j]
        G.add_edge(node1, node2)

  return G

def merge_cluster(cluster_dict, node1, node2):
  # Assign both nodes to the cluster of node1
  cluster_dict[node2] = cluster_dict[node1]