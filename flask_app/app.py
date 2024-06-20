import json
import pickle
import os
import numpy as np
from utils import *
from flask import Flask, jsonify, render_template, request, session

app = Flask(__name__)

# store ground points (causes errors)
# print(os.listdir('static/data/chase_1/'))
# try:
#     with open("static/data/chase_1/ground_points.pkl", "rb") as f:
#         ground_points = pickle.load(f)
# except Exception as e:
#     print(f"Error loading ground points: {e}")

ground_points = read_list_from_json("static/data/chase_1/ground_points.json")

@app.route("/", methods=["GET", "POST"])
def home():
    print('render template home')
    return render_template('home.html')

@app.route("/get_sample_data")
def get_sample_data():
    return

@app.route("/run_localization", methods = ['POST'])
def run_localization():
    json_body = request.form['payload']
    json_body = json.loads(json_body)


    # process json
    location = json_body['location']
    start_minutes = json_body['start_minutes']
    start_seconds = json_body['start_minutes']
    duration_minutes = json_body['start_minutes']
    duration_seconds = json_body['start_minutes']
    end_minutes = start_minutes + duration_minutes
    end_seconds = start_seconds + duration_seconds
    activated_sensors = [bool(activated) for activated in json_body['activated_cameras']]
    result = jsonify({'hel':'lo'})
    return result
    
    #return render_template('home.html')

@app.route("/send_data", methods=["POST"])
def send_data():
  if request.method == "POST":
    #try:
        js_data = request.get_json()  # Parse JSON data from request body
        frame_number = js_data['frame_number']
        activated_cameras = process_cameras(js_data['activated_cameras'])
        min_points = js_data['min_points']
        max_dist = int(js_data['max_distance'])
        
        # filter frame ground points for desired cameras
        frame_ground_points = ground_points[frame_number]
        filtered_ground_points = []
        for activated,camera_data in zip(activated_cameras,frame_ground_points):
            if activated:
                filtered_ground_points.append(camera_data)
            else:
                filtered_ground_points.append([])
        
        # create graph and perform point merging
        G, position_dict = create_graph(filtered_ground_points, max_dist)
        #G = consolidate_projections(G,max_dist=40)
        #print(G)
        #print("Data received from JavaScript:", js_data)
        #print(js_data)
        
        # prepare graph data for 
        node_data = dict(G.nodes(data=True))
        edge_data = list(G.edges)
        centroids = list(compute_centroids(G,min_points))
        payload = {'nodes':node_data, # store in dict for transfer to frontend
                   'edges':edge_data,
                   'centroids':centroids}

        #print(f"ground point dict :{ground_point_dict}")
        #print(f"position dict: {payload}")
        return jsonify(payload)
        
        #return jsonify(data)
    #except Exception as e:  # Handle potential JSON parsing errors
    #  return jsonify({"error": str(e)}), 400  # Bad request error
    

@app.route("/process_data", methods=["POST"])
def process_data():
    json_body = request.form['payload']
    json_body = json.loads(json_body)
    data = request.get_json()["data"]
    # Process data (example: reverse the string)
    result = data[::-1]
    

    return jsonify({"result": result})

@app.route("/get_data")
def get_data():
    data = {"name": "World", "message": "Hello from Flask!"}
    return jsonify(data)

if __name__ == '__main__':
   app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 4000)), debug=False)
