import math
import numpy as np
import sys
import json
import sqlite3
from sqlite3 import Error
import copy

videoNum = 50
labelNum = 16

labelPosInDB = 5
db_videos = []
db_users = []
db_history = []
user_history = []
currentUser = 10

diversity_weight = 0.3


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


database = "data_logistic.db"
conn = create_connection(database)


def selectVideos(connect):
    cur = connect.cursor()
    cur.execute("SELECT * FROM Videos")

    rows = cur.fetchall()
    return rows


def selectUsers(connect):
    cur = connect.cursor()
    cur.execute("SELECT * FROM Users")

    rows = cur.fetchall()
    return rows


def selectHistory(connect):
    cur = connect.cursor()
    cur.execute("SELECT * FROM WatchHistory")

    rows = cur.fetchall()
    return rows


def main():
    global userID
    for line in sys.stdin:
        userID = line

    return_to_js = []
    res_list = start()
    for res in res_list:
        return_to_js.append(str(res.video))

#    print(return_to_js)


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
    return numer / float(denomin)


def rooted(i):
    return math.sqrt(sum([float(a) * float(a) for a in i]))


def euclidean_simil(a, b):
    return math.sqrt(sum(pow(float(i) - float(j), 2) for i, j in zip(a, b)))


def content():
    with conn:
        db_videos = selectVideos(conn)
        db_users = selectUsers(conn)

    finalist = []

    for elems in db_users:
        if elems[0] == int(userID):
            global userP
            userP = elems[2]

    for elems in db_videos:
        userP0 = userP.split(";")
        labels = elems[labelPosInDB].split(";")
        labels[-1] = labels[-1].strip()
        finalist.append(Video(elems[0], euclidean_simil(userP0, labels), labels))

    finalist = sorted(finalist, key=lambda x: x.value, reverse=False)[:videoNum]

    return finalist


def diversity(contentlist):

    matrix = np.empty((0, labelNum))
    for each in contentlist:
        matrix = np.append(matrix, [each.labels], axis=0)

    reversed = matrix.transpose()

    totalsum = 0
    div = []

    for line in reversed:
        div.append(np.count_nonzero(line == '1') / videoNum)

    for each in matrix:
        for pos in range(labelNum):
            totalsum += (float(each[pos]) - div[pos]) ** 2

    std_dev = math.sqrt(totalsum / videoNum)

    return std_dev


class User(object):
    def __init__(self, user, value, videos):
        self.user = user
        self.value = value
        self.videos = videos

    def __repr__(self):
        return '{} {} {}'.format(self.user, self.value, self.videos)

    def getuser(self):
        return self.user

    def getkey(self):
        return self.value

    def getlist(self):
        return self.videos


def dis(a, b):
    numer = sum(float(i) * float(j) for i, j in zip(a, b))
    denomin = rooted(a) * rooted(b)
    return numer / float(denomin)


def rooted(i):
    return math.sqrt(sum([float(a) * float(a) for a in i]))


def collaborative():
    with conn:
        db_users = selectUsers(conn)
        db_history = selectHistory(conn)
    try:
        finalist = []
        userP0 = []

        for elems in db_users:
            if elems[0] == int(userID):
                userP0 = list(elems[2].split(";"))[:16]

        for elems in db_history:
            if elems[0] == int(userID):
                user_history.append(elems[1])

        for users in db_users:
            if users[0] != int(userID):
                others = list(users[2].split(";"))[:16]
                otherhistories = []
                for histories in db_history:
                    if users[0] == histories[0]:
                        otherhistories.append(histories[1])
                finalist.append(User(users[0], dis(userP0, others), otherhistories))

        userlist = sorted(finalist, key=lambda x: x.value, reverse=True)

        return userlist

    except:
        print("Collaborative Filtering is failed")


def mix(cnt, topusers, contentlist):
    check = True
    userLabels = userP.split(";")

    for x in topusers:
        temp = x.videos
        for i in range(0, len(temp)):
            newV = str(temp[i])

            for y in contentlist:
                if str(y.video) == newV or newV == '\n' or user_history.__contains__(newV) or len(newV) != 11:
                    check = False
            if check:
                contentlist[cnt * 2 % videoNum].video = newV
                forlabels = findlabel(newV)
                contentlist[cnt * 2 % videoNum].value = euclidean_simil(userLabels, forlabels)
                contentlist[cnt * 2 % videoNum].labels = forlabels

                return contentlist
            check = True

    return contentlist


def Avg_Simil(list):
    newlist = []
    for each in list:
        newlist.append(each.value)
    return np.average(newlist)


def Clone(li0):
    li_copy = li0[:]
    return li_copy


def findlabel(new):
    label = ""
    fv = open('rawdata/RealVideoData_logistic.csv')

    for line in fv:
        elems = line.split(",")
        if (new == elems[0]):
            labels = elems[1].split(";")
            labels[-1] = labels[-1].strip()
#            print(labels)
#            label = list(elems[1])[:labelNum]

    fv.close()
    return label


def start():
    contentlist = content()
    print(contentlist)
    new_contentlist = copy.deepcopy(contentlist)

    std_dev = diversity(contentlist)
    topusers = collaborative()
    newsum = 0

    # normalise
    for user in topusers:
        newsum += user.value
    for user in topusers:
        user.value = user.value/newsum

#    avg_simil = Avg_Simil(contentlist)
#    max_val = max(0, (avg_simil*(1-diversity_weight) + (diversity_weight*std_dev))/2)

    cnt = 1
    while cnt < ((videoNum/5)+1):
        mix(cnt, topusers, contentlist)
#        new_avg_simil = Avg_Simil(contentlist)
#        new_threshold_changed = (new_avg_simil*(1-diversity_weight) + (diversity_weight*std_dev))/2
        cnt += 1

#        if (new_threshold_changed > max_val):
#            new_contentlist = copy.deepcopy(contentlist)
#            print(new_contentlist)
#        max_val = max(max_val, new_threshold_changed)

#    print(contentlist)
    return contentlist


def run(thisUser):
    global userID
    userID = thisUser
    return start()


main()
