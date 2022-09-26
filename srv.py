from flask import Flask, request, jsonify, make_response
from flask_cors import CORS, cross_origin
import json
import uuid

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

data=""

@app.route("/<dataid>")
def getdata(dataid):
    #print("hi1"+dataid)

    global data
    #print(str(data))
    if(len(data) == 0 or data['_id'] != dataid):
        f = open(dataid+".txt", "r")
        data = json.loads(f.read())
    return json.dumps(data)

@app.route('/make', methods=['GET','POST','OPTIONS'])
@cross_origin()
def make():
    uid = str(uuid.uuid1());
    #print("hi2")
    f = open(uid+".txt", "w")
    f.write(json.dumps("{}"))
    f.close()
    return '{"_id":"'+uid+'"}'

@app.route('/set/<dataid>', methods=['GET','POST','OPTIONS'])
@cross_origin()
def set(dataid):
    #print("hi2")
    f = open(dataid+".txt", "w")
    f.write(json.dumps(request.json))
    f.close()
    global data
    data = request.json
    return ""
