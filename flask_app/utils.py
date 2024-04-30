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
    return G, position_dict

def consolidate_projections(G,max_dist=40):
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