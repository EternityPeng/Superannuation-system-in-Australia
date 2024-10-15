from flask import Flask, render_template, redirect, url_for, request
from flask import make_response
from scipy import io
import json
import logging
import math
import numpy as np
import os
import random
import scipy as sp


def main():
  logging.info("Mine Data")
  logging.info(os.getcwd())

  if request.method == "POST":

    sb = sp.io.loadmat('data/mining/sb4') #Load the boundsry matrix
    array = sb.get('sb')
    values = np.shape(array)
    #logging.info(values)

    returner = {}

    #Set graph variables.
    ymax = 0
    ymin = 0
    pl_ymax = 0
    xlabel = "Remaining reserve (1,000 tons)"
    ylabel = "Copper price ($1m)"
    zlabel = "Time (years)"
    graphTitle = "Switching Boundaries"

    roundfactor = 10

    for i in range(values[2]):
      if np.nanmax(array[:,:,int(i)]) > ymax:
        ymax = np.nanmax(array[:,:,int(i)])

      mat = array[:,:,int(i)].tolist()
      newmat = []

      for arr in mat:
        arr = [0 if math.isnan(x) else x for x in arr]
        newmat.append(arr)

      reserves = list(range(0, len(newmat) * 5, 5))
      times = list(range(0, len(newmat[0]), 1))
      dicti = {"matrix": newmat, "reserves": reserves, "times": times} #Store results in a dictionary and append to result set.
      #logging.info(dict)
      returner["value"+str(i)] = dicti


    #Generate a random path for price

    sigma = 0.3
    dt = 0.5
    mu = 0.08
    path = []
    S0 = 1
    X0 = 0 # X=ln S


    for i in range(max(times) + 1):
      nextDelta = random.normalvariate(0,1)
      X0 += (mu - 0.5 * sigma * sigma) * dt + sigma * nextDelta * math.sqrt(dt)
      S0 = math.exp(X0)
      path.append(S0)
      if S0 > pl_ymax:
        pl_ymax = S0

    #logging.info("PATH: " + json.dumps(path));

    #Format the response and return.

    returner = make_response('{"data": ' + json.dumps(returner) + ', "xmin":' + json.dumps(min(reserves)) + ', "xmax": '
     + json.dumps(max(reserves)) + ', "ymax": ' + json.dumps(ymax) + ', "ymin": ' + json.dumps(ymin) + ', "roundfactor": '
     + json.dumps(roundfactor) + ', "xlabel": ' + json.dumps(xlabel) + ', "ylabel": ' + json.dumps(ylabel) + ', "zlabel": '
     + json.dumps(zlabel) + ', "title": ' + json.dumps(graphTitle) + ', "path": ' + json.dumps(path) + ', "pl_ymax": '
     + json.dumps(pl_ymax) + '}')

    return returner


def recalculate():

  logging.info("Recalculating Path") #Log the service information, debugging.
  if request.method == "POST":     #If we receive a POST request, we want to return a recalculated path.
                     #Can put a check for a specific message sent so that we don't spit data to anyone.
    times = list(range(0, 120, 1))

    sigma = 0.3
    dt = 0.5
    mu = 0.08
    path = []
    S0 = 1
    X0 = 0 # X=ln S


    for i in range(max(times) + 1):
      nextDelta = random.normalvariate(0,1)
      X0 += (mu - 0.5 * sigma * sigma) * dt + sigma * nextDelta * math.sqrt(dt)
      S0 = math.exp(X0)
      path.append(S0)

    #logging.info("PATH: " + json.dumps(path));

    returner = make_response('{ "path": ' + json.dumps(path) + '}') #JSON encode the data and return.
    return returner

