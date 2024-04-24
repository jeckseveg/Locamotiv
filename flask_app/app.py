import json
import pickle
import numpy as np
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def home():
    return render_template('home.html')

@app.route("/get_sample_data")
def get_sample_data():
    return

@app.route("/run_localization", methods = ['POST'])
def run_localization():
    json_body = request.form['payload']
    json_body = json.loads(json_body)

    print(json_body)

    # process json
    location = json_body['location']
    start_minutes = json_body['start_minutes']
    start_seconds = json_body['start_minutes']
    duration_minutes = json_body['start_minutes']
    duration_seconds = json_body['start_minutes']
    end_minutes = start_minutes + duration_minutes
    end_seconds = start_seconds + duration_seconds
    activated_sensors = [bool(activated) for activated in json_body['activated_cameras']]
    result = jsonify({'fuck':'me'})
    print(result)
    print(type(result))
    print(result.data.decode())
    return result
    
    #return render_template('home.html')

@app.route("/send_data", methods=["POST"])
def send_data():
  if request.method == "POST":
    
    try:
        data = request.get_json()  # Parse JSON data from request body
        print("Data received from JavaScript:", data)
        print(data)
        
        filename = 'static/data/chase_1/graph_data.pkl'
        with open(filename,'rb') as f:
            ground_point_dict = pickle.load(f)
        
        print(ground_point_dict)
        return jsonify(ground_point_dict)
        
        #return jsonify(data)
    except Exception as e:  # Handle potential JSON parsing errors
      return jsonify({"error": str(e)}), 400  # Bad request error
    

@app.route("/process_data", methods=["POST"])
def process_data():
    json_body = request.form['payload']
    json_body = json.loads(json_body)
    print(json_body)
    data = request.get_json()["data"]
    # Process data (example: reverse the string)
    result = data[::-1]
    

    return jsonify({"result": result})

@app.route("/get_data")
def get_data():
    data = {"name": "World", "message": "Hello from Flask!"}
    return jsonify(data)

if __name__ == '__main__':
   app.run(debug=True)