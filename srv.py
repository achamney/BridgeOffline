from flask import Flask, request, jsonify, make_response
from flask_cors import CORS, cross_origin
import json

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

data=""

@app.route("/")
def hello_world():
    print("hi1")

    global data
    if(len(data) == 0):
        f = open("data.txt", "r")
        data = f.read()
    return data

@app.route('/set', methods=['GET','POST','OPTIONS'])
@cross_origin()
def set():
    print("hi2")
    f = open("data.txt", "w")
    f.write(json.dumps(request.json))
    f.close()
    global data
    data = json.dumps(request.json)
    return ""
