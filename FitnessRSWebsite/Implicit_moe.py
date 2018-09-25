import numpy as np
import sqlite3
from sqlite3 import Error

db_videos = []
db_users = []
db_history = []


def create_connection(db):

    try:
        conn = sqlite3.connect(db)
        return conn
    except Error as e:
        print(e)

    return None


database = "data_moe.db"


def selectVideos():
    conn = create_connection(database)
    cur = conn.cursor()
    cur.execute("SELECT * FROM Videos")

    rows = cur.fetchall()
    conn.close()
    return rows


def selectUsers():
    conn = create_connection(database)
    cur = conn.cursor()
    cur.execute("SELECT * FROM Users")

    rows = cur.fetchall()
    conn.close()
    return rows


def selectHistory():
    conn = create_connection(database)
    cur = conn.cursor()
    cur.execute("SELECT * FROM WatchHistory")

    rows = cur.fetchall()
    conn.close()
    return rows


def main():
    global userID
    userID = 10

    res = implicit()
    print(res)


class UserPrefer(object):

    def __init__(self, user, prefer, history):
        self.user = user
        self.prefer = prefer
        self.history = history

    def __repr__(self):
        return '{},{},{}'.format(self.user, self.prefer, self.history)

    def getuser(self):
        return self.user

    def getprefer(self):
        return self.prefer

    def gethistory(self):
        return self.history


def implicit():
    targetUser = UserPrefer('', '', '')
    videolist = []

    db_users = selectUsers()
    db_history = selectHistory()

    for videos in db_history:
        if videos[0] == int(userID):
            videolist.append(videos[1])

    for user in db_users:
        if user[0] == userID:
            targetUser = UserPrefer(user[0], user[2], ';'.join(str(x) for x in videolist))

    if len(videolist) == 0:
        newprefer = targetUser.prefer
    else:
        watchnum = watchsum(videolist)
        newprefer = adjust(targetUser.prefer, len(videolist), watchnum)
        newprefer = ';'.join(str(x) for x in newprefer)

    return newprefer


def watchsum(videolist):
    result = list("0000000000000000")

    wholeVideos = selectVideos()

    for videos in wholeVideos:
        if videos[0] in videolist:
            videoinfo = list(videos[5].replace('\n', ''))
            for i in range(0, len(videoinfo)):
                result[i] = int(result[i]) + int(videoinfo[i])

    return result


# If a sum of labels is lower than an adjust number,
# preference will preserve,
# if it is higher than an adjust number,
# history will affect more
def adjust(user, hisnum, his):
    orig = list(user.split(";"))
    neworig = []
    adjnum = 30
    for orig0, his0 in zip(orig, his):
        orig0 = int(orig0)
        float_orig = float(orig0)
        result = np.arctan((float_orig*adjnum/hisnum + his0*hisnum/adjnum)) * 2/np.pi
        neworig.append(result)

    return neworig


main()
