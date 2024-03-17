# Check config file is valid
# create BBs
# plumb BBs together
# start BBs
# monitor tasks

# packages
import tomli
import time
import logging
import zmq
# local
from sqliteConnect import sqliteConnect
from scanner_find import BarcodeScanner
from mqtt_send import MQTT_forwarding


logger = logging.getLogger("main")
logging.basicConfig(level=logging.DEBUG)  # move to log config file using python functionality

def get_config():
    with open("./config/config.toml", "rb") as f:
        toml_conf = tomli.load(f)
    logger.info(f"config:{toml_conf}")
    return toml_conf


def config_valid(config):
    return True


def create_building_blocks(config):
    bbs = {}

    scan_out = {"type": zmq.PULL, "address": "tcp://127.0.0.1:4000", "bind": True}
    back_end_In = {"type": zmq.PULL, "address": "tcp://127.0.0.1:4000", "bind": False}
    back_end_out = {"type": zmq.PULL, "address": "tcp://127.0.0.1:4001", "bind": True}
    mqtt_out = {"type": zmq.PULL, "address": "tcp://127.0.0.1:4001", "bind": False}

    bbs["scan"] = BarcodeScanner(config, scan_out)
    bbs["backend"] = sqliteConnect(config, {'in': back_end_In, 'out': back_end_out})
    bbs["mqtt"] = BarcodeScanner(config, mqtt_out)
    return bbs


def start_building_blocks(bbs):
    for key in bbs:
        p = bbs[key].start()


def monitor_building_blocks(bbs):
    while True:
        time.sleep(1)
        for key in bbs:
            # logger.debug(f"{bbs[key].exitcode}, {bbs[key].is_alive()}")
            # todo actually monitor
            pass

if __name__ == "__main__":
    conf = get_config()
    # todo set logging level from config file
    if config_valid(conf):
        bbs = create_building_blocks(conf)
        start_building_blocks(bbs)
        monitor_building_blocks(bbs)
    else:
        raise Exception("bad config")
