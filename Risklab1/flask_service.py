from flask import Flask, render_template, redirect, url_for, request
#from flask import make_response
from flask_cors import CORS, cross_origin
from flask_script import Manager
#from random import randint
#import math
#import random
#import scipy as sp
#import numpy as np
#from scipy import io
#import datetime
import logging
#import json
import mine
import aa
import supa
import supacalculator
import supadd
import pm


#Setup a log file to track the service.

logging.basicConfig(filename='testlog', filemode='a',
format='%(asctime)s,%(msecs)d %(name)s %(levelname)s %(message)s',
datefmt='%H:%M:%S',
level=logging.INFO)

app = Flask(__name__, static_url_path="", static_folder="static")
CORS(app)
manager = Manager(app)

@app.route("/") #Define main page behaviour (Useful to check the service is running).
def hello():
  logging.info("RUNNING")
  return '<h1>Hello World!</h1>'

@app.route('/test_temp')
def test_temp():
    return render_template('test_temp.html')

# mining demo ===========================================================================

@app.route('/mine')
def render():
    return render_template('mine.html')

@app.route('/mine_help')
def render_mine_help():
    return render_template('mine_help.html')

@app.route("/mine_main", methods=['GET', 'POST'])
def mine_main():
  return mine.main()

#Define a new route for the web service, address is host/recalculate.
#Allowable methods are GET and POST
@app.route("/mine_recalculate", methods=['GET', 'POST'])
def mine_recalculate():
  return mine.recalculate()

# asset allocation demo =================================================================

@app.route('/aa')
def render_aa():
    return render_template('aa.html')

@app.route('/aa_help')
def render_aa_help():
    return render_template('aa_help.html')

@app.route("/aa_main", methods=['GET', 'POST'])
def aa_main():
  return aa.main()

@app.route("/aa_recalculate", methods=['GET', 'POST'])
def aa_recalculate():
  return aa.recalculate()

# SUPA Stage1 demo =============================================================================

@app.route('/supa')
def render_supa():
    return render_template('supa.html')

@app.route('/supa_help')
def render_supa_help():
    return render_template('supa_help.html')

@app.route("/supa_main", methods=['GET', 'POST'])
def supa_main():
  return supa.main()

@app.route("/supa_recalculate", methods=['GET', 'POST'])
def supa_recalculate():
  return supa.recalculate()

# SUPA Stage2 demo =============================================================================

@app.route('/supacalculator')
def render_supa_calculator():
    return render_template('supa_calculator.html')

@app.route("/calculator_main", methods=['GET', 'POST'])
def render_calculator_main():
    return supacalculator.main()

# SUPA Stage3 demo =============================================================================

@app.route('/supadrawdown')
def render_supa_budget():
    return render_template('supa_drawdown.html')

@app.route("/drawdown_main", methods=['GET', 'POST'])
def render_drawdown_main():
    return supadd.main()

# SUPA Stage3 demo =============================================================================

@app.route('/pm')
def render_pm():
    return render_template('pm.html')

@app.route("/pm_main", methods=['GET', 'POST'])
def render_pm_main():
    return pm.main()

if __name__ == "__main__":
    # here is starting of the development HTTP server
    app.run()
    #app.run(host='127.0.0.1', debug=True, port=5000)
    #manager.run()
