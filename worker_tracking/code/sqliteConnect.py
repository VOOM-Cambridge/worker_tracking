import multiprocessing
import sqlite3
from datetime import datetime
import json
import time
import zmq
import logging

context = zmq.Context()
logger = logging.getLogger("main.message_rewriter")

class sqliteConnect(multiprocessing.Process):
    def __init__(self, config, zmq_conf):
        super().__init__()
        self.tableName = config['sqlite3']['dataBaseName']
        self.fileName = config['sqlite3']['filePath']
        self.name = config["Factory"]["name"]

        self.locationID = config['constants']['location'] 
        # declarations
        self.zmq_conf = zmq_conf
        self.zmq_in = None
        self.zmq_out = None

    def do_connect(self):
        self.zmq_in = context.socket(self.zmq_conf['in']['type'])
        if self.zmq_conf['in']["bind"]:
            self.zmq_in.bind(self.zmq_conf['in']["address"])
        else:
            self.zmq_in.connect(self.zmq_conf['in']["address"])

        self.zmq_out = context.socket(self.zmq_conf['out']['type'])
        if self.zmq_conf['out']["bind"]:
            self.zmq_out.bind(self.zmq_conf['out']["address"])
        else:
            self.zmq_out.connect(self.zmq_conf['out']["address"])

    def connect(self):
        self.conn = sqlite3.connect(self.fileName, detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        self.cursor = self.conn.cursor()
        checkTable = ''' SELECT count(name) FROM sqlite_master WHERE type='table' AND name='{}' '''.format(self.tableName)
        checkAnswer = self.cursor.execute(checkTable)
        logger.info(checkAnswer)
        if self.cursor.fetchone()[0]!=1:
            logger.info("Table needs creating")
            table = """CREATE TABLE {0}(IDNUM VARCHAR(50), FIRST_NAME VARCHAR(100), STATUS VARCHAR(20), TIME_LAST_ACTION TIMESTAMP, TIME_WORKED INTEGER, TIME_WORKED_TODAY INTEGER);""".format(self.tableName)
            self.cursor.execute(table)

    def addNew(self, IDnum, firstName, status):
        self.cursor = self.conn.cursor()
        timeNow = datetime.now()
        insertQuery = """INSERT INTO {0} VALUES (?, ?, ?, ?, ?, ?);""".format(self.tableName)
        self.cursor.execute(insertQuery, (IDnum, firstName, status, timeNow, 0, 0))
        #self.cursor.execute(conn)
        self.conn.commit()
        return "data added"

    def updateStatus(self, IDnum, statusNew):
        data = self.checkIfExists(IDnum)
        lastAction = data[3]
        timeWorkedOld = data[4]
        timeWokedToday = data[5]
        self.cursor = self.conn.cursor()
        timeNow = datetime.now()
        reset = False
        dayStart = datetime(timeNow.year, timeNow.month, timeNow.day, 0, 0, 0)
        if statusNew == "Log out": # logging out of job
            # calculate time passed since login
            timePastS = (timeNow - lastAction).total_seconds()
            # calculate time since day start 
            if lastAction < dayStart:
                reset = True
                timeForDay = (timeNow - dayStart).total_seconds()
            else:
                timeForDay = (timeNow - lastAction).total_seconds()
        else: # logging in to job
            if lastAction < dayStart:
                reset = True
            timePastS = 0 
            timeForDay = 0    
        # convert new times to get ready to store
        logger.info(timePastS)
        timeWorked = timeWorkedOld + timePastS
        if reset: # new day 
            timeWorkToday = timeForDay
        else:
            timeWorkToday = timeForDay + timeWokedToday
        # Updating
        conText = '''UPDATE {0} SET STATUS = '{2}', TIME_LAST_ACTION = '{3}', TIME_WORKED = '{4}', TIME_WORKED_TODAY = '{5}' WHERE IDNUM = '{1}';'''.format(self.tableName, IDnum, statusNew, timeNow, timeWorked, timeWorkToday)

        self.cursor.execute(conText)
        self.conn.commit()
        return "data updated in " + IDnum

    def allData(self):
        data = self.cursor.execute('''SELECT * FROM {0}'''.format(self.tableName))
        return data
    
    def checkIfExists(self, IDnum):
        res = self.cursor.execute("SELECT * FROM {0} WHERE trim(IDNUM) LIKE '{1}'".format(self.tableName, IDnum))
        data = res.fetchall()
        if len(data) > 0:
            return data[0]
        else:
            return []
        
    def run(self):
        logger.info("Starting")
        self.do_connect()
        logger.info("ZMQ Connected")
        run = True
        while run:
            while self.zmq_in.poll(500, zmq.POLLIN):
                msg = self.zmq_in.recv()
                msg_json = json.loads(msg)
                logger.info("MQTT_processing: mess recieved to process")
                self.change_state(msg_json["barcode"], "__blank__")

    def change_state(self, barcode, name):
        check = self.checkIfExists(barcode)
        if len(check) > 0:
            # then there is already and entry update it
            stateFound = check[2]
            workerTime = check[4]
            name = check[1]
            if stateFound == "Log in":
                self.updateStatus(barcode, "Log out")
                stateFound = "Log out"
            elif stateFound == "Log out":
                self.updateStatus(barcode, "Log in")
                stateFound = "Log in"
        else:
            # no worker alreayd add new entry
            self.addNew(barcode, name, "Log in")
            stateFound = "Log in"
        check = self.checkIfExists(barcode)
        self.mqtt_send(barcode, stateFound, name, check[4])
        logger.info(check[4])

    async def mqtt_send(self, ID_barcode, state_mess, name, workerTime):
        mess = {}
        mess["location"] = self.locationID
        mess["id"] = ID_barcode
        mess["state"] = state_mess
        mess["name"] = name
        mess['timeWorked'] = workerTime
        mess["timestamp"]= str(datetime.now())
        logger.info("Sending messea")
        await self.zmq_out.send_json(mess)
            
