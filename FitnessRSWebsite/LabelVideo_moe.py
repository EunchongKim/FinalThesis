import math
from time import sleep
import numpy as np
import sys
import json
import sqlite3
from sqlite3 import Error

videoNum = 50
labelNum = 16

labelPosInDB = 5

db_videos = []
db_users = []
db_history = []
user_history = []
currentUser = 10


def read_in():
    line = sys.stdin.readline()
    return json.loads(line)


def create_connection(db):

    try:
        conn = sqlite3.connect(db)
        return conn
    except Error as e:
        print(e)

    return None


database = "data_moe.db"
conn = create_connection(database)


def selectVideos(connect):
    cur = connect.cursor()
    cur.execute("SELECT * FROM Videos")

    rows = cur.fetchall()
    return rows


def main():
    global targetLabel
    target = ''
    for line in sys.stdin:
        target = line

    targetLabel = target.split(";");

    return_to_js = []
    res_list = content()
    for res in res_list:
        return_to_js.append(str(res.video))

    print(return_to_js)



class Video(object):
    def __init__(self, video, value, labels):
        self.video = video
        self.value = value
        self.labels = labels

    def __repr__(self):
        return '{}'.format(self.video)

    def getkey(self):
        return self.value

    def getlabel(self):
        return self.labels


def cosine(a, b):
    numer = sum(float(i) * float(j) for i, j in zip(a, b))
    denomin = rooted(a) * rooted(b)
    return round(numer / float(denomin), 3)


def rooted(i):
    return round(math.sqrt(sum([float(a) * float(a) for a in i])), 3)


def content():
    with conn:
        db_videos = selectVideos(conn)

    finalist = []

    for elems in db_videos:
        labels = list(elems[labelPosInDB])[:labelNum]
        finalist.append(Video(elems[0], cosine(targetLabel, labels), labels))

    finalist = sorted(finalist, key=lambda x: x.value, reverse=True)[:videoNum]

#    print(finalist)

    return finalist


main()
