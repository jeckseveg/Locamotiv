from flask import Flask, jsonify, render_template
app = Flask(__name__)

@app.route("/")
def home():
    return render_template('home.html')

@app.route("/get_sample_data")
def get_sample_data():
    return

if __name__ == '__main__':
   app.run(debug=True)